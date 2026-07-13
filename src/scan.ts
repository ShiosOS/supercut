// The pipeline, start to finish. Run: bun run scan <market>
// findAds → watch each ad (fingerprint, cuts, frames, questionnaire) →
// dedupe → cap per brand → relevance gate → tally → qa → explain → render.
// AI describes single ads and phrases counted patterns; every number in
// between comes from plain code.

import path from "node:path";
import {
  MAX_ADS_PER_BRAND,
  MAX_ADS_WATCHED,
  MIN_ADS_FOR_CHAPTER,
  MIN_ADS_FOR_PLAYBOOK,
  STUDY_SCORE_WEIGHTS,
  WATCH_CONCURRENCY,
} from "./constants";
import { generateBrandBrief } from "./brief";
import { mapWithConcurrency } from "./concurrency";
import { dataPaths, marketSlug, readJsonIfExists, writeJson } from "./dataDir";
import { capPerBrand, dedupeCreatives } from "./dedupe";
import { buildExemplarsByFormat } from "./exemplars";
import { explainTally } from "./explain";
import { findAds } from "./findAds";
import { applyRelevanceGate } from "./gate";
import { writeProgress } from "./progress";
import { buildQaReport } from "./qa";
import { renderBriefBlock } from "./render/briefBlock";
import { renderPlaybook } from "./render/playbook";
import { buildTally } from "./tally";
import { triageByMetadata } from "./triage";
import { watchAd, type Mechanicals, type MechanicalsCache } from "./watchAd";

const marketArgument = process.argv[2];
const sampleBriefBrand = argValue("--sample-brief");
if (!marketArgument || marketArgument.startsWith("--")) {
  console.error('Usage: bun run scan <market> [--sample-brief "brand, one sentence"]');
  process.exit(1);
}
// The app passes the slug ("skin-care"); searches and prompts want the words.
const market = marketArgument.replaceAll("-", " ");

const progress = (
  stage: Parameters<typeof writeProgress>[0]["stage"],
  detail: string,
  watched = 0,
  toWatch = 0,
) => writeProgress({ market, stage, detail, watched, toWatch, updatedAt: "" });

// Stage timing goes to the scan log so slow runs can be diagnosed at a glance.
let stageStartedAt = Date.now();
function logStageDone(stage: string): void {
  console.log(`${stage}: ${((Date.now() - stageStartedAt) / 1000).toFixed(1)}s`);
  stageStartedAt = Date.now();
}

try {
  await progress("searching", "pulling candidate ads from the ad library");
  const { ads: candidates, searched } = await findAds(market);
  console.log(`pool: ${candidates.length} admitted candidates (30+ days, seen in last 30)`);
  logStageDone("findAds");

  // Spend the watch budget on likely on-market ads first; the real gate
  // still judges every watched ad from the video itself.
  const ordered = await triageByMetadata(market, candidates);
  const toWatch = ordered.slice(0, MAX_ADS_WATCHED);
  logStageDone("triage");

  // Ads are watched in parallel; the mechanicals cache is loaded once here,
  // filled in memory, and persisted once after the phase.
  const mechanicalsCache: MechanicalsCache = new Map(
    Object.entries(
      (await readJsonIfExists<Record<string, Mechanicals>>(dataPaths.mechanicals(market))) ?? {},
    ),
  );
  let completed = 0;
  await progress("watching", `watching ${toWatch.length} ads`, 0, toWatch.length);
  const outcomesByAd = await mapWithConcurrency(toWatch, WATCH_CONCURRENCY, async (ad) => {
    const outcome = await watchAd(market, ad, mechanicalsCache);
    completed += 1;
    await progress(
      "watching",
      `watched ${completed} of ${toWatch.length} ads`,
      completed,
      toWatch.length,
    );
    return outcome;
  });
  await writeJson(dataPaths.mechanicals(market), Object.fromEntries(mechanicalsCache));

  const watched = outcomesByAd.flatMap((outcome) =>
    outcome.status === "watched" ? [outcome] : [],
  );
  const skips = outcomesByAd.flatMap((outcome) => (outcome.status === "skipped" ? [outcome] : []));
  for (const skip of skips) {
    console.log(
      `  skip ${skip.adId} (${skip.brand}): ${skip.reason}${skip.detail ? ` [${skip.detail}]` : ""}`,
    );
  }
  console.log(`watched: ${watched.length}, skipped: ${skips.length}`);
  logStageDone("watch");

  const uniqueCreatives = dedupeCreatives(
    watched.map(({ facts, fingerprint }) => ({ ad: facts.ad, fingerprint })),
  );
  const cappedAds = capPerBrand(
    uniqueCreatives.map((entry) => entry.ad),
    MAX_ADS_PER_BRAND,
  );
  const keptIds = new Set(cappedAds.map((ad) => ad.id));
  const outcomes = watched
    .filter((entry) => keptIds.has(entry.facts.ad.id))
    .map((entry) => applyRelevanceGate(entry.facts));
  const pool = outcomes.flatMap((outcome) =>
    outcome.status === "admitted" ? [outcome.facts] : [],
  );
  const rejections = outcomes.flatMap((outcome) =>
    outcome.status === "rejected" ? [outcome] : [],
  );
  console.log(
    `after dedupe + brand cap: ${keptIds.size}; relevance gate kept ${pool.length}, rejected ${rejections.length}`,
  );

  if (pool.length < MIN_ADS_FOR_PLAYBOOK) {
    throw new Error(
      poolStarvationReport({
        searched,
        candidates: candidates.length,
        watched: watched.length,
        skips,
        rejected: rejections.length,
        kept: pool.length,
      }),
    );
  }

  await progress("counting", "counting patterns across the pool");
  const tally = buildTally(pool, MIN_ADS_FOR_CHAPTER);
  const qa = buildQaReport(pool);

  await progress("explaining", "writing chapters from the counted patterns");
  // Exemplars need only the tally, not the prose, so they build (frames read,
  // permalinks fetched) while the explain call is in flight.
  const exemplarsPromise = buildExemplarsByFormat(market, tally, pool);
  const prose = await explainTally(market, tally, qa);
  logStageDone("explain");
  await writeJson(dataPaths.tallies(market), {
    market,
    generatedAt: new Date().toISOString(),
    tally,
    qa,
    prose,
  });

  const sampleBriefHtml = sampleBriefBrand
    ? renderBriefBlock(
        sampleBriefBrand,
        await generateBrandBrief(market, sampleBriefBrand, tally, prose),
      )
    : undefined;
  if (sampleBriefBrand) logStageDone("sample brief");

  await progress("rendering", "assembling the playbook");
  const html = renderPlaybook({
    market,
    generatedAt: new Date().toISOString().slice(0, 10),
    counts: {
      searched,
      candidates: toWatch.length,
      watched: watched.length,
      admitted: pool.length,
      rejected: rejections.length,
    },
    tally,
    prose,
    qa,
    appendix: { rejections, skips },
    exemplarsByFormat: await exemplarsPromise,
    studyScoreWeights: STUDY_SCORE_WEIGHTS,
    sampleBriefHtml,
  });

  const outputPath = path.join("examples", `${marketSlug(market)}.html`);
  await Bun.write(outputPath, html);
  await progress("done", `playbook written to ${outputPath}`);
  logStageDone("render");
  console.log(`done: ${outputPath} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await writeProgress({
    market,
    stage: "failed",
    detail: "scan failed",
    watched: 0,
    toWatch: 0,
    error: message,
    updatedAt: "",
  });
  console.error(`scan failed: ${message}`);
  process.exit(1);
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

/** When too few ads survive to write a playbook, say where the funnel starved
 * and what to do about it — this message surfaces in the app, so it has to
 * carry the whole diagnosis. */
function poolStarvationReport(funnel: {
  searched: number;
  candidates: number;
  watched: number;
  skips: { reason: string }[];
  rejected: number;
  kept: number;
}): string {
  const path =
    `${funnel.searched} search results → ${funnel.candidates} long-running candidates → ` +
    `${funnel.watched} analyzed (${funnel.skips.length} skipped) → ` +
    `${funnel.kept} on-market after ${funnel.rejected} rejections`;

  let hint = "Try a broader market name.";
  if (funnel.candidates < MIN_ADS_FOR_PLAYBOOK) {
    hint = "The ad library has few long-running ads for this term — try a broader market name.";
  } else if (funnel.skips.length > funnel.watched) {
    const counts = new Map<string, number>();
    for (const skip of funnel.skips) counts.set(skip.reason, (counts.get(skip.reason) ?? 0) + 1);
    const [topReason, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    hint =
      `Most ads could not be analyzed (${topCount} of ${funnel.skips.length} skips: "${topReason}"). ` +
      "If skips mention the AI, the model key is likely rate-limited — lower WATCH_CONCURRENCY in src/constants.ts and re-run; finished work is cached.";
  } else if (funnel.rejected > funnel.kept) {
    hint =
      "Most analyzed ads sold something outside this market — try a more product-specific market name.";
  }

  return (
    `Only ${funnel.kept} relevant long-running ads found — fewer than the ${MIN_ADS_FOR_PLAYBOOK} ` +
    `needed to count patterns honestly. The funnel: ${path}. ${hint}`
  );
}
