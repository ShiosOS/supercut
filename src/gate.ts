// The relevance gate. A market search leaks: "coffee" returns dropshipping
// courses, recipe pages, and mug sellers. The questionnaire asks what each ad
// actually sells; this pure function turns that answer into an admit/reject
// decision that the playbook's appendix reports openly.

import type { AdFacts } from "./tally";

export type GateOutcome =
  | { status: "admitted"; facts: AdFacts }
  | { status: "rejected"; adId: string; brand: string; reason: string };

/** Admits ads selling the market's product or something adjacent to it
 * (adjacent ads stay visible through the segment breakdown). Off-market ads
 * are rejected with the model's own description as the stated reason. */
export function applyRelevanceGate(facts: AdFacts): GateOutcome {
  if (facts.factSheet.marketFit === "off-market") {
    return {
      status: "rejected",
      adId: facts.ad.id,
      brand: facts.ad.brand,
      reason: `off-market: sells "${facts.factSheet.whatItSells}"`,
    };
  }
  return { status: "admitted", facts };
}
