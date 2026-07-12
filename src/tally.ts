// Stage 4: pure counting. FactSheets in, Tally out. Every number the playbook
// prints is computed here, and every count keeps its contributing ad ids as
// receipts so any claim can be traced back to the ads behind it.

import type { Ad } from "./ad";
import type { FactSheet } from "./factSheet";

/** One described ad, ready to be counted. */
export interface AdFacts {
  ad: Ad;
  factSheet: FactSheet;
  /** ffmpeg-measured, not the model's estimate. */
  measuredCutsFirst10s: number;
}

/** "N of M ads answered X", with the N ad ids attached. */
export interface Count {
  label: string;
  count: number;
  adIds: string[];
}

export interface Distribution {
  total: number;
  counts: Count[];
}

export interface FormatTally {
  formatLabel: FactSheet["formatLabel"];
  adIds: string[];
  brandCount: number;
  medianDaysRunning: number;
  medianMeasuredCutsFirst10s: number;
  hookStyle: Distribution;
  productOnScreen: Distribution;
  ctaStyle: Distribution;
  creatorVsBrandFeel: Distribution;
  demoClarity: Distribution;
  pacing: Distribution;
  emotionalTone: Distribution;
  worksWithSoundOff: Distribution;
}

export interface Tally {
  totalAds: number;
  brandCount: number;
  medianDaysRunning: number;
  /** Formats with enough ads for a chapter, largest first. */
  formats: FormatTally[];
  /** Formats seen but too small to generalize from. */
  smallFormats: { formatLabel: FactSheet["formatLabel"]; adIds: string[] }[];
  segments: Distribution;
  poolProductOnScreen: Distribution;
  poolHookStyle: Distribution;
  poolCtaStyle: Distribution;
}

export function buildTally(pool: AdFacts[], minAdsForChapter: number): Tally {
  const byFormat = groupBy(pool, (facts) => facts.factSheet.formatLabel);
  const formats: FormatTally[] = [];
  const smallFormats: Tally["smallFormats"] = [];

  for (const [formatLabel, members] of byFormat) {
    if (members.length >= minAdsForChapter) {
      formats.push(tallyFormat(formatLabel, members));
    } else {
      smallFormats.push({ formatLabel, adIds: members.map((facts) => facts.ad.id) });
    }
  }
  formats.sort((a, b) => b.adIds.length - a.adIds.length);

  return {
    totalAds: pool.length,
    brandCount: new Set(pool.map((facts) => facts.ad.brand)).size,
    medianDaysRunning: median(pool.map((facts) => facts.ad.daysRunning)),
    formats,
    smallFormats,
    segments: distribution(pool, (facts) => facts.factSheet.segment),
    poolProductOnScreen: distribution(pool, (facts) => facts.factSheet.productOnScreen),
    poolHookStyle: distribution(pool, (facts) => facts.factSheet.hookStyle),
    poolCtaStyle: distribution(pool, (facts) => facts.factSheet.ctaStyle),
  };
}

function tallyFormat(
  formatLabel: FactSheet["formatLabel"],
  members: AdFacts[],
): FormatTally {
  return {
    formatLabel,
    adIds: members.map((facts) => facts.ad.id),
    brandCount: new Set(members.map((facts) => facts.ad.brand)).size,
    medianDaysRunning: median(members.map((facts) => facts.ad.daysRunning)),
    medianMeasuredCutsFirst10s: median(members.map((facts) => facts.measuredCutsFirst10s)),
    hookStyle: distribution(members, (facts) => facts.factSheet.hookStyle),
    productOnScreen: distribution(members, (facts) => facts.factSheet.productOnScreen),
    ctaStyle: distribution(members, (facts) => facts.factSheet.ctaStyle),
    creatorVsBrandFeel: distribution(members, (facts) => facts.factSheet.creatorVsBrandFeel),
    demoClarity: distribution(members, (facts) => facts.factSheet.demoClarity),
    pacing: distribution(members, (facts) => facts.factSheet.pacing),
    emotionalTone: distribution(members, (facts) => facts.factSheet.emotionalTone),
    worksWithSoundOff: distribution(members, (facts) =>
      facts.factSheet.worksWithSoundOff ? "works muted" : "needs sound",
    ),
  };
}

function distribution(pool: AdFacts[], getLabel: (facts: AdFacts) => string): Distribution {
  const byLabel = groupBy(pool, getLabel);
  const counts: Count[] = [...byLabel].map(([label, members]) => ({
    label,
    count: members.length,
    adIds: members.map((facts) => facts.ad.id),
  }));
  counts.sort((a, b) => b.count - a.count);
  return { total: pool.length, counts };
}

function groupBy<K extends string>(pool: AdFacts[], getKey: (facts: AdFacts) => K) {
  const groups = new Map<K, AdFacts[]>();
  for (const facts of pool) {
    const key = getKey(facts);
    const members = groups.get(key) ?? [];
    members.push(facts);
    groups.set(key, members);
  }
  return groups;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}
