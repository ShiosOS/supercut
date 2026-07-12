// Ranks admitted ads by how much they deserve a human's attention. The score
// never claims an ad "won" — it orders the pool for exemplar picks and the
// "examples that lasted" lists. Weights live in constants.ts and are printed
// verbatim in the playbook footnote.

import {
  MIN_PLAYS_FOR_ENGAGEMENT_RATE,
  SHARE_WORTH_IN_LIKES,
  STUDY_SCORE_WEIGHTS,
} from "./constants";
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
  const maxRate = Math.max(...pool.map((facts) => engagementRate(facts.ad)), Number.MIN_VALUE);

  const scored = pool.map((facts): StudyScore => {
    const components = {
      longevity: facts.ad.daysRunning / maxDays,
      engagement: engagementRate(facts.ad) / maxRate,
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

/** Likes and shares per play, shares weighted heavier. A rate, not a count:
 * plays on paid ads are bought, so raw counts mostly measure budget. Ads
 * below the plays floor (or with no play data, common on Facebook) score
 * zero here and rank on longevity and label confidence alone. */
function engagementRate(ad: Ad): number {
  if (ad.playCount < MIN_PLAYS_FOR_ENGAGEMENT_RATE) return 0;
  return (ad.likeCount + ad.shareCount * SHARE_WORTH_IN_LIKES) / ad.playCount;
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
