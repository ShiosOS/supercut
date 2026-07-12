// Ranks admitted ads by how much they deserve a human's attention. The score
// never claims an ad "won" — it orders the pool for exemplar picks and the
// "examples that lasted" lists. Weights live in constants.ts and are printed
// verbatim in the playbook footnote.

import { SHARE_WORTH_IN_PLAYS, STUDY_SCORE_WEIGHTS } from "./constants";
import type { Ad } from "./ad";
import type { AdFacts } from "./tally";

export interface StudyScore {
  adId: string;
  brand: string;
  score: number;
  components: { longevity: number; engagement: number; formatConfidence: number };
}

const CONFIDENCE_VALUE = { high: 1, medium: 0.6, low: 0.3 } as const;

/** Scores every ad relative to the pool it sits in, best first. */
export function scoreAds(pool: AdFacts[]): StudyScore[] {
  const maxDays = Math.max(...pool.map((facts) => facts.ad.daysRunning), 1);
  // log10 tames the heavy tail: 10M plays should not drown 100k entirely.
  const maxLogEngagement = Math.max(
    ...pool.map((facts) => Math.log10(engagementSignal(facts.ad) + 1)),
    1,
  );

  const scored = pool.map((facts): StudyScore => {
    const components = {
      longevity: facts.ad.daysRunning / maxDays,
      engagement: Math.log10(engagementSignal(facts.ad) + 1) / maxLogEngagement,
      formatConfidence: CONFIDENCE_VALUE[facts.factSheet.formatConfidence],
    };
    const score =
      components.longevity * STUDY_SCORE_WEIGHTS.longevity +
      components.engagement * STUDY_SCORE_WEIGHTS.engagement +
      components.formatConfidence * STUDY_SCORE_WEIGHTS.formatConfidence;
    return { adId: facts.ad.id, brand: facts.ad.brand, score, components };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/** Plays plus shares, with each share counted as many plays: sharing is a
 * deliberate endorsement of the creative, watching is often an accident. */
function engagementSignal(ad: Ad): number {
  return ad.playCount + ad.shareCount * SHARE_WORTH_IN_PLAYS;
}

/** Top ads for a frame strip or example list: best scores first, but at most
 * one per brand so the evidence spans the market. */
export function pickExemplars(scored: StudyScore[], max: number): StudyScore[] {
  const picked: StudyScore[] = [];
  const usedBrands = new Set<string>();
  for (const entry of scored) {
    if (picked.length >= max) break;
    if (usedBrands.has(entry.brand)) continue;
    usedBrands.add(entry.brand);
    picked.push(entry);
  }
  return picked;
}
