// Pure logic for collapsing duplicate creatives and capping brand dominance.
// The same video often runs under several ad ids and page names; only the
// longest-running copy should count, or the tallies double-count one idea.

import type { Ad } from "./ad";
import type { Fingerprint } from "./media";

/** Hamming distance (in bits, of 64) below which two middle-frame hashes are
 * treated as the same creative, provided durations also agree. */
const PERCEPTUAL_HASH_MAX_DISTANCE = 5;

/** Durations further apart than this are never the same creative. */
const DURATION_TOLERANCE_SECONDS = 1.5;

export interface FingerprintedAd {
  ad: Ad;
  fingerprint: Fingerprint;
}

/** Collapses near-identical creatives to the longest-running copy. */
export function dedupeCreatives(pool: FingerprintedAd[]): FingerprintedAd[] {
  const kept: FingerprintedAd[] = [];
  const byLongevity = [...pool].sort((a, b) => b.ad.daysRunning - a.ad.daysRunning);
  for (const candidate of byLongevity) {
    const duplicate = kept.some((existing) =>
      isSameCreative(existing.fingerprint, candidate.fingerprint),
    );
    if (!duplicate) kept.push(candidate);
  }
  return kept;
}

function isSameCreative(a: Fingerprint, b: Fingerprint): boolean {
  if (a.sha256 === b.sha256) return true;
  if (Math.abs(a.durationSeconds - b.durationSeconds) > DURATION_TOLERANCE_SECONDS) {
    return false;
  }
  return hammingDistance(a.perceptualHash, b.perceptualHash) <= PERCEPTUAL_HASH_MAX_DISTANCE;
}

function hammingDistance(hexA: string, hexB: string): number {
  const bitsDiffering = BigInt(`0x${hexA}`) ^ BigInt(`0x${hexB}`);
  let count = 0;
  for (let bits = bitsDiffering; bits > 0n; bits >>= 1n) {
    if (bits & 1n) count += 1;
  }
  return count;
}

/** Keeps at most `cap` ads per brand (longest-running first) so one heavy
 * advertiser cannot dominate the pool's tallies. */
export function capPerBrand(ads: Ad[], cap: number): Ad[] {
  const perBrand = new Map<string, number>();
  const kept: Ad[] = [];
  const byLongevity = [...ads].sort((a, b) => b.daysRunning - a.daysRunning);
  for (const ad of byLongevity) {
    const used = perBrand.get(ad.brand) ?? 0;
    if (used < cap) {
      perBrand.set(ad.brand, used + 1);
      kept.push(ad);
    }
  }
  return kept;
}
