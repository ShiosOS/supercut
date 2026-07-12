// The relevance gate is what keeps a dropshipping course out of a coffee
// playbook. Off-market ads must be rejected with a visible reason, never
// silently counted.

import { describe, expect, test } from "bun:test";
import { applyRelevanceGate } from "../src/gate";
import { makeAd, makeFactSheet } from "./fixtures";

describe("applyRelevanceGate", () => {
  test("admits core-product ads", () => {
    const outcome = applyRelevanceGate({
      ad: makeAd(),
      factSheet: makeFactSheet({ marketFit: "core product" }),
      measuredCutsFirst10s: 3,
    });
    expect(outcome.status).toBe("admitted");
  });

  test("admits adjacent products so segments can break them out", () => {
    const outcome = applyRelevanceGate({
      ad: makeAd(),
      factSheet: makeFactSheet({ marketFit: "adjacent product", segment: "brewing equipment" }),
      measuredCutsFirst10s: 3,
    });
    expect(outcome.status).toBe("admitted");
  });

  test("rejects off-market ads and says what they were actually selling", () => {
    const outcome = applyRelevanceGate({
      ad: makeAd({ id: "leak", brand: "Guru Inc" }),
      factSheet: makeFactSheet({
        marketFit: "off-market",
        whatItSells: "A dropshipping course",
      }),
      measuredCutsFirst10s: 3,
    });
    expect(outcome.status).toBe("rejected");
    if (outcome.status === "rejected") {
      expect(outcome.reason).toContain("dropshipping course");
    }
  });
});
