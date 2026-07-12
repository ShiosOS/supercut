// The study score ranks which admitted ads are most worth a human's attention.
// It must reward longevity first, and exemplar picks must span brands.

import { describe, expect, test } from "bun:test";
import { pickExemplars, scoreAds } from "../src/studyScore";
import { makeAd, makeFactSheet } from "./fixtures";

function facts(id: string, brand: string, daysRunning: number, playCount = 10_000) {
  return {
    ad: makeAd({ id, brand, daysRunning, playCount }),
    factSheet: makeFactSheet(),
    measuredCutsFirst10s: 4,
  };
}

describe("scoreAds", () => {
  test("longer-running ads outrank higher-play short-lived ones", () => {
    const scored = scoreAds([
      facts("veteran", "Acme", 180, 10_000),
      facts("viral", "Bravo", 31, 5_000_000),
    ]);
    expect(scored[0]?.adId).toBe("veteran");
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

  test("scores stay in 0..1", () => {
    const scored = scoreAds([facts("a", "Acme", 400, 90_000_000), facts("b", "Bravo", 31, 0)]);
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
