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
    const early = demoChapter?.productOnScreen.counts.find((c) => c.label === "first 3 seconds");
    expect(early?.count).toBe(2);
    expect(early?.adIds.sort()).toEqual(["d1", "d2"]);
  });

  test("formats below the chapter minimum go to smallFormats, not chapters", () => {
    const tally = buildTally(pool, 3);
    expect(tally.formats.map((f) => f.formatLabel)).toEqual(["product demo"]);
    expect(tally.smallFormats).toEqual([{ formatLabel: "creator testimonial", adIds: ["t1"] }]);
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

  test("video lengths land in ordered buckets with honest denominators", () => {
    const lengths = [
      { ...demoAd("d1", "Acme"), ad: makeAd({ id: "d1", durationSeconds: 12 }) },
      { ...demoAd("d2", "Bravo"), ad: makeAd({ id: "d2", brand: "Bravo", durationSeconds: 28 }) },
      {
        ...demoAd("d3", "Clipper"),
        ad: makeAd({ id: "d3", brand: "Clipper", durationSeconds: 75 }),
      },
      // Unknown duration: drops out of the stat, shrinking its denominator.
      { ...demoAd("d4", "Delta"), ad: makeAd({ id: "d4", brand: "Delta", durationSeconds: 0 }) },
    ];
    const tally = buildTally(lengths, 3);
    const videoLength = tally.formats[0]?.videoLength;
    expect(videoLength?.total).toBe(3);
    expect(videoLength?.counts.map((c) => c.label)).toEqual(["under 15s", "15-30s", "over 60s"]);
    expect(tally.formats[0]?.medianVideoSeconds).toBe(28);
  });

  test("platform mix is tallied per format", () => {
    const mixed = [
      { ...demoAd("d1", "Acme"), ad: makeAd({ id: "d1", platform: "tiktok" }) },
      { ...demoAd("d2", "Bravo"), ad: makeAd({ id: "d2", brand: "Bravo", platform: "tiktok" }) },
      {
        ...demoAd("d3", "Clipper"),
        ad: makeAd({ id: "d3", brand: "Clipper", platform: "facebook" }),
      },
    ];
    const tally = buildTally(mixed, 3);
    const platform = tally.formats[0]?.platform;
    expect(platform?.counts.find((c) => c.label === "tiktok")?.count).toBe(2);
  });

  test("button text is tallied, skipping ads without a button", () => {
    const buttons = [
      { ...demoAd("d1", "Acme"), ad: makeAd({ id: "d1", buttonText: "Shop now" }) },
      {
        ...demoAd("d2", "Bravo"),
        ad: makeAd({ id: "d2", brand: "Bravo", buttonText: "Shop now" }),
      },
      { ...demoAd("d3", "Clipper"), ad: makeAd({ id: "d3", brand: "Clipper", buttonText: "" }) },
    ];
    const tally = buildTally(buttons, 3);
    const buttonText = tally.formats[0]?.buttonText;
    expect(buttonText?.total).toBe(2);
    expect(buttonText?.counts[0]).toMatchObject({ label: "Shop now", count: 2 });
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
