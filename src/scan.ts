// The pipeline, start to finish. Run: bun run scan <market>
// findAds → watch each ad (fingerprint, cuts, frames, questionnaire) →
// dedupe → cap per brand → relevance gate → tally → qa → explain → render.
// AI describes single ads and phrases counted patterns; every number in
// between comes from plain code.

import path from "node:path";
import { MAX_ADS_PER_BRAND, MAX_ADS_WATCHED, MIN_ADS_FOR_CHAPTER, MIN_ADS_FOR_PLAYBOOK, STUDY_SCORE_WEIGHTS } from "./constants";
import { generateBrandBrief } from "./brief";
import { dataPaths, marketSlug, writeJson } from "./dataDir";
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
import { watchAd } from "./watchAd";

const market = process.argv[2];
const sampleBriefBrand = argValue("--sample-brief");
if (!market || market.startsWith("--")) {
  console.error('Usage: bun run scan <market> [--sample-brief "brand, one sentence"]');
  process.exit(1);
}

const progress = (stage: Parameters<typeof writeProgress>[0]["stage"], detail: string, watched = 0, toWatch = 0) =>
  writeProgress({ market, stage, detail, watched, toWatch, updatedAt: "" });

try {
  await progress("searching", "pulling candidate ads from the ad library");
  const { ads: candidates, searched } = await findAds(market);
  console.log(`pool: ${candidates.length} admitted candidates (30+ days, seen in last 30)`);

  const toWatch = candidates.slice(0, MAX_ADS_WATCHED);
  const watched: Extract<Awaited<ReturnType<typeof watchAd>>, { status: "watched" }>[] = [];
  const skips: { adId: string; brand: string; reason: string }[] = [];
  for (const [index, ad] of toWatch.entries()) {
    await progress("watching", `watching ad ${index + 1} of ${toWatch.length}`, index, toWatch.length);
    const outcome = await watchAd(market, ad);
    if (outcome.status === "watched") watched.push(outcome);
    else {
      skips.push(outcome);
      console.log(`  skip ${ad.id} (${ad.brand}): ${outcome.reason}`);
    }
  }
  console.log(`watched: ${watched.length}, skipped: ${skips.length}`);

  const uniqueCreatives = dedupeCreatives(watched.map(({ facts, fingerprint }) => ({ ad: facts.ad, fingerprint })));
  const cappedAds = capPerBrand(uniqueCreatives.map((entry) => entry.ad), MAX_ADS_PER_BRAND);
  const keptIds = new Set(cappedAds.map((ad) => ad.id));
  const outcomes = watched.filter((entry) => keptIds.has(entry.facts.ad.id)).map((entry) => applyRelevanceGate(entry.facts));
  const pool = outcomes.flatMap((outcome) => (outcome.status === "admitted" ? [outcome.facts] : []));
  const rejections = outcomes.flatMap((outcome) => (outcome.status === "rejected" ? [outcome] : []));
  console.log(`after dedupe + brand cap: ${keptIds.size}; relevance gate kept ${pool.length}, rejected ${rejections.length}`);

  if (pool.length < MIN_ADS_FOR_PLAYBOOK) {
    throw new Error(
      `Only ${pool.length} relevant long-running ads found — fewer than the ${MIN_ADS_FOR_PLAYBOOK} needed to count patterns honestly. Try a broader market name.`,
    );
  }

  await progress("counting", "counting patterns across the pool");
  const tally = buildTally(pool, MIN_ADS_FOR_CHAPTER);
  const qa = buildQaReport(pool);

  await progress("explaining", "writing chapters from the counted patterns");
  const prose = await explainTally(market, tally, qa);
  await writeJson(dataPaths.tallies(market), { market, generatedAt: new Date().toISOString(), tally, qa, prose });

  const sampleBriefHtml = sampleBriefBrand
    ? renderBriefBlock(sampleBriefBrand, await generateBrandBrief(market, sampleBriefBrand, tally, prose))
    : undefined;

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
    exemplarsByFormat: await buildExemplarsByFormat(market, tally, pool),
    studyScoreWeights: STUDY_SCORE_WEIGHTS,
    sampleBriefHtml,
  });

  const outputPath = path.join("examples", `${marketSlug(market)}.html`);
  await Bun.write(outputPath, html);
  await progress("done", `playbook written to ${outputPath}`);
  console.log(`done: ${outputPath} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await writeProgress({ market, stage: "failed", detail: "scan failed", watched: 0, toWatch: 0, error: message, updatedAt: "" });
  console.error(`scan failed: ${message}`);
  process.exit(1);
}

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
