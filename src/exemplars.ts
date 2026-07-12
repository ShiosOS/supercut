// Picks each chapter's exemplar ads at render time and loads their cached
// hook frames as data URLs. Exemplars are the playbook's visual receipts, so
// low-confidence format labels are excluded — they count in tallies but never
// front a chapter.

import { MAX_EXEMPLARS_PER_CHAPTER } from "./constants";
import { dataPaths } from "./dataDir";
import { HOOK_FRAME_TIMESTAMPS } from "./constants";
import type { ExemplarView } from "./render/playbook";
import { pickExemplars, scoreAds } from "./studyScore";
import type { AdFacts, Tally } from "./tally";

export async function buildExemplarsByFormat(
  market: string,
  tally: Tally,
  pool: AdFacts[],
): Promise<Record<string, ExemplarView[]>> {
  const byId = new Map(pool.map((facts) => [facts.ad.id, facts]));
  const result: Record<string, ExemplarView[]> = {};

  for (const format of tally.formats) {
    const members = format.adIds
      .map((adId) => byId.get(adId))
      .filter((facts): facts is AdFacts => facts !== undefined)
      .filter((facts) => facts.factSheet.formatConfidence !== "low");
    const picked = pickExemplars(scoreAds(members), MAX_EXEMPLARS_PER_CHAPTER);
    result[format.formatLabel] = await Promise.all(
      picked.map((score) => toExemplarView(market, byId.get(score.adId) as AdFacts)),
    );
  }
  return result;
}

async function toExemplarView(market: string, facts: AdFacts): Promise<ExemplarView> {
  const frameDataUrls: string[] = [];
  for (let index = 0; index < HOOK_FRAME_TIMESTAMPS.length; index += 1) {
    const file = Bun.file(dataPaths.hookFrame(market, facts.ad.id, index));
    if (!(await file.exists())) continue;
    const bytes = await file.bytes();
    frameDataUrls.push(`data:image/webp;base64,${Buffer.from(bytes).toString("base64")}`);
  }
  return {
    adId: facts.ad.id,
    brand: facts.ad.brand,
    daysRunning: facts.ad.daysRunning,
    playCount: facts.ad.playCount,
    hookQuote: facts.factSheet.spokenHookQuote,
    frameDataUrls,
  };
}
