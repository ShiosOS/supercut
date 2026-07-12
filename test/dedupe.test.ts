// Dedupe must collapse the same creative posted under different ad ids (and
// different page names) to the longest-running copy, and cap ads per brand.

import { describe, expect, test } from "bun:test";
import { capPerBrand, dedupeCreatives } from "../src/dedupe";
import { makeAd, makeFingerprint } from "./fixtures";

describe("dedupeCreatives", () => {
  test("keeps distinct creatives", () => {
    const pool = [
      {
        ad: makeAd({ id: "a" }),
        fingerprint: makeFingerprint({
          sha256: "1".repeat(64),
          perceptualHash: "0000000000000000",
        }),
      },
      {
        ad: makeAd({ id: "b" }),
        fingerprint: makeFingerprint({
          sha256: "2".repeat(64),
          perceptualHash: "ffffffffffffffff",
        }),
      },
    ];
    expect(
      dedupeCreatives(pool)
        .map((entry) => entry.ad.id)
        .sort(),
    ).toEqual(["a", "b"]);
  });

  test("collapses byte-identical videos to the longest-running ad", () => {
    const fingerprint = makeFingerprint();
    const pool = [
      { ad: makeAd({ id: "short", daysRunning: 31 }), fingerprint },
      { ad: makeAd({ id: "long", daysRunning: 90, brand: "Other Page Name" }), fingerprint },
    ];
    const kept = dedupeCreatives(pool);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.ad.id).toBe("long");
  });

  test("collapses near-identical videos (close perceptual hash, same duration)", () => {
    const pool = [
      {
        ad: makeAd({ id: "original", daysRunning: 60 }),
        fingerprint: makeFingerprint({
          sha256: "1".repeat(64),
          perceptualHash: "ff00ff00ff00ff00",
        }),
      },
      {
        // One bit differs in the hash — a re-encode of the same creative.
        ad: makeAd({ id: "reupload", daysRunning: 40 }),
        fingerprint: makeFingerprint({
          sha256: "2".repeat(64),
          perceptualHash: "ff00ff00ff00ff01",
        }),
      },
    ];
    const kept = dedupeCreatives(pool);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.ad.id).toBe("original");
  });

  test("does not collapse similar-looking videos with different durations", () => {
    const pool = [
      {
        ad: makeAd({ id: "a" }),
        fingerprint: makeFingerprint({ sha256: "1".repeat(64), durationSeconds: 15 }),
      },
      {
        ad: makeAd({ id: "b" }),
        fingerprint: makeFingerprint({ sha256: "2".repeat(64), durationSeconds: 45 }),
      },
    ];
    expect(dedupeCreatives(pool)).toHaveLength(2);
  });
});

describe("capPerBrand", () => {
  test("keeps at most the cap per brand, preferring longest-running", () => {
    const ads = [
      makeAd({ id: "a1", brand: "Acme", daysRunning: 90 }),
      makeAd({ id: "a2", brand: "Acme", daysRunning: 80 }),
      makeAd({ id: "a3", brand: "Acme", daysRunning: 70 }),
      makeAd({ id: "b1", brand: "Bravo", daysRunning: 31 }),
    ];
    const kept = capPerBrand(ads, 2);
    expect(kept.map((ad) => ad.id).sort()).toEqual(["a1", "a2", "b1"]);
  });
});
