// Tallying is where the playbook's numbers come from. Every count must carry
// the ad ids behind it, and formats below the chapter minimum must be set
// aside rather than silently merged.

import { describe, expect, test } from "bun:test";
import { buildTally } from "../src/tally";
import { makeAd, makeFactSheet } from "./fixtures";

function demoAd(id: string, brand: string, overrides = {}) {
  return {
    ad: makeAd({ id, brand }),
    factSheet: makeFactSheet(overrides),
    measuredCutsFirst10s: 4,
  };
}

const pool = [
  demoAd("d1", "Acme", { productOnScreen: "first 3 seconds" }),
  demoAd("d2", "Bravo", { productOnScreen: "first 3 seconds" }),
  demoAd("d3", "Clipper", { productOnScreen: "later" }),
  demoAd("t1", "Delta", { formatLabel: "creator testimonial" }),
];

describe("buildTally", () => {
  test("counts carry the contributing ad ids as receipts", () => {
    const tally = buildTally(pool, 3);
    const demoChapter = tally.formats.find((f) => f.formatLabel === "product demo");
    const early = demoChapter?.productOnScreen.counts.find(
      (c) => c.label === "first 3 seconds",
    );
    expect(early?.count).toBe(2);
    expect(early?.adIds.sort()).toEqual(["d1", "d2"]);
  });

  test("formats below the chapter minimum go to smallFormats, not chapters", () => {
    const tally = buildTally(pool, 3);
    expect(tally.formats.map((f) => f.formatLabel)).toEqual(["product demo"]);
    expect(tally.smallFormats).toEqual([
      { formatLabel: "creator testimonial", adIds: ["t1"] },
    ]);
  });

  test("chapter medians come from the pool's real values", () => {
    const withCuts = [
      { ...demoAd("d1", "Acme"), measuredCutsFirst10s: 2 },
      { ...demoAd("d2", "Bravo"), measuredCutsFirst10s: 5 },
      { ...demoAd("d3", "Clipper"), measuredCutsFirst10s: 9 },
    ];
    const tally = buildTally(withCuts, 3);
    expect(tally.formats[0]?.medianMeasuredCutsFirst10s).toBe(5);
  });

  test("brand counts deduplicate brands", () => {
    const tally = buildTally(pool, 3);
    expect(tally.totalAds).toBe(4);
    expect(tally.brandCount).toBe(4);
    expect(tally.formats[0]?.brandCount).toBe(3);
  });

  test("segments are tallied pool-wide", () => {
    const segmented = [
      demoAd("s1", "Acme", { segment: "beans & pods" }),
      demoAd("s2", "Bravo", { segment: "beans & pods" }),
      demoAd("s3", "Clipper", { segment: "brewing equipment" }),
    ];
    const tally = buildTally(segmented, 3);
    const beans = tally.segments.counts.find((c) => c.label === "beans & pods");
    expect(beans?.count).toBe(2);
  });
});
