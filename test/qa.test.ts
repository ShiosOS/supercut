// The QA report is where model reliability is measured, not assumed: cut
// estimates against ffmpeg ground truth, hook quotes against provider
// transcripts, and format labels the model itself was unsure of.

import { describe, expect, test } from "bun:test";
import { buildQaReport } from "../src/qa";
import { makeAd, makeFactSheet } from "./fixtures";

describe("buildQaReport", () => {
  test("measures how far model cut estimates drift from ffmpeg", () => {
    const report = buildQaReport([
      {
        ad: makeAd({ id: "a" }),
        factSheet: makeFactSheet({ estimatedCutsFirst10s: 4 }),
        measuredCutsFirst10s: 4,
      },
      {
        ad: makeAd({ id: "b" }),
        factSheet: makeFactSheet({ estimatedCutsFirst10s: 10 }),
        measuredCutsFirst10s: 4,
      },
    ]);
    expect(report.cutEstimate.meanAbsoluteError).toBe(3);
    expect(report.cutEstimate.shareWithin2).toBe(0.5);
  });

  test("lists ads whose format label the model was unsure of", () => {
    const report = buildQaReport([
      { ad: makeAd({ id: "sure" }), factSheet: makeFactSheet(), measuredCutsFirst10s: 4 },
      {
        ad: makeAd({ id: "unsure" }),
        factSheet: makeFactSheet({ formatConfidence: "low" }),
        measuredCutsFirst10s: 4,
      },
    ]);
    expect(report.lowConfidenceFormatAdIds).toEqual(["unsure"]);
  });

  test("corroborates spoken hook quotes against the provider transcript", () => {
    const report = buildQaReport([
      {
        ad: makeAd({
          id: "match",
          providerTranscript: "this is the SMOOTHEST cold brew ever, trust me",
        }),
        factSheet: makeFactSheet({ spokenHookQuote: "This is the smoothest cold brew ever" }),
        measuredCutsFirst10s: 4,
      },
      {
        ad: makeAd({ id: "mismatch", providerTranscript: "totally different words here" }),
        factSheet: makeFactSheet({ spokenHookQuote: "This is the smoothest cold brew ever" }),
        measuredCutsFirst10s: 4,
      },
      {
        ad: makeAd({ id: "no-transcript", providerTranscript: null }),
        factSheet: makeFactSheet(),
        measuredCutsFirst10s: 4,
      },
    ]);
    expect(report.hookQuotes).toEqual({
      corroborated: 1,
      contradicted: 1,
      notCheckable: 1,
      contradictedAdIds: ["mismatch"],
    });
  });

  test("flags ads labeled no-ask that carry a purchase button", () => {
    const report = buildQaReport([
      {
        ad: makeAd({ id: "mismatch", buttonText: "Shop now" }),
        factSheet: makeFactSheet({ ctaStyle: "none" }),
        measuredCutsFirst10s: 4,
      },
      {
        // "Learn more" is a soft button; a no-ask label is consistent with it.
        ad: makeAd({ id: "soft-button", buttonText: "Learn more" }),
        factSheet: makeFactSheet({ ctaStyle: "none" }),
        measuredCutsFirst10s: 4,
      },
      {
        ad: makeAd({ id: "consistent", buttonText: "Shop now" }),
        factSheet: makeFactSheet({ ctaStyle: "hard" }),
        measuredCutsFirst10s: 4,
      },
    ]);
    expect(report.ctaDiscrepancy).toEqual({ count: 1, adIds: ["mismatch"] });
  });

  test("on-screen text hooks are not checkable against audio transcripts", () => {
    const report = buildQaReport([
      {
        // ASR cannot hear on-screen text, so a missing match proves nothing.
        ad: makeAd({ id: "text-hook", providerTranscript: "totally different words here" }),
        factSheet: makeFactSheet({
          spokenHookQuote: "POV: your coffee in 10 seconds",
          hookQuoteSource: "on-screen text",
        }),
        measuredCutsFirst10s: 4,
      },
    ]);
    expect(report.hookQuotes.notCheckable).toBe(1);
    expect(report.hookQuotes.contradicted).toBe(0);
  });
});
