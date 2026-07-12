// The study score ranks which admitted ads are most worth a human's attention.
// It must reward longevity first, and exemplar picks must span brands.

import { describe, expect, test } from "bun:test";
import { pickExemplars, scoreAds } from "../src/studyScore";
import { makeAd, makeFactSheet } from "./fixtures";

function facts(
  id: string,
  brand: string,
  daysRunning: number,
  metrics: { playCount?: number; likeCount?: number; shareCount?: number } = {},
) {
  return {
    ad: makeAd({
      id,
      brand,
      daysRunning,
      playCount: metrics.playCount ?? 100_000,
      likeCount: metrics.likeCount ?? 1_000,
      shareCount: metrics.shareCount ?? 0,
    }),
    factSheet: makeFactSheet(),
    measuredCutsFirst10s: 4,
  };
}

describe("scoreAds", () => {
  test("longer-running ads outrank higher-play short-lived ones", () => {
    const scored = scoreAds([
      facts("veteran", "Acme", 180, { playCount: 10_000, likeCount: 100 }),
      facts("viral", "Bravo", 31, { playCount: 5_000_000, likeCount: 50_000 }),
    ]);
    expect(scored[0]?.adId).toBe("veteran");
  });

  test("engagement is a rate: a small ad that resonates beats a big-budget one", () => {
    const scored = scoreAds([
      // 5% like rate on 50k plays vs 0.5% on 5M plays, same longevity.
      facts("resonant", "Acme", 60, { playCount: 50_000, likeCount: 2_500 }),
      facts("big-budget", "Bravo", 60, { playCount: 5_000_000, likeCount: 25_000 }),
    ]);
    expect(scored[0]?.adId).toBe("resonant");
  });

  test("tiny denominators do not produce fake-high rates", () => {
    const scored = scoreAds([
      // 90% like rate but only 200 plays — below the floor, engagement is 0.
      facts("tiny", "Acme", 60, { playCount: 200, likeCount: 180 }),
      facts("proven", "Bravo", 60, { playCount: 100_000, likeCount: 2_000 }),
    ]);
    expect(scored[0]?.adId).toBe("proven");
  });

  test("low format confidence drags an ad down against an equal peer", () => {
    const shaky = {
      ad: makeAd({ id: "shaky" }),
      factSheet: makeFactSheet({ formatConfidence: "low" }),
      measuredCutsFirst10s: 4,
    };
    const clean = {
      ad: makeAd({ id: "clean", brand: "Bravo" }),
      factSheet: makeFactSheet({ formatConfidence: "high" }),
      measuredCutsFirst10s: 4,
    };
    const scored = scoreAds([shaky, clean]);
    expect(scored[0]?.adId).toBe("clean");
  });

  test("shares outweigh likes: sharing is the stronger endorsement", () => {
    const scored = scoreAds([
      facts("shared", "Acme", 60, { playCount: 100_000, likeCount: 1_000, shareCount: 500 }),
      facts("liked", "Bravo", 60, { playCount: 100_000, likeCount: 2_000, shareCount: 0 }),
    ]);
    expect(scored[0]?.adId).toBe("shared");
  });

  test("scores stay in 0..1", () => {
    const scored = scoreAds([
      facts("a", "Acme", 400, { playCount: 90_000_000, likeCount: 9_000_000, shareCount: 500_000 }),
      facts("b", "Bravo", 31, { playCount: 0, likeCount: 0 }),
    ]);
    for (const entry of scored) {
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(1);
    }
  });
});

describe("pickExemplars", () => {
  test("takes top-scored ads but at most one per brand", () => {
    const scored = scoreAds([
      facts("a1", "Acme", 200),
      facts("a2", "Acme", 190),
      facts("b1", "Bravo", 120),
      facts("c1", "Clipper", 40),
    ]);
    const picked = pickExemplars(scored, 2);
    expect(picked.map((entry) => entry.adId)).toEqual(["a1", "b1"]);
  });
});
