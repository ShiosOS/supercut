// Stage 6: the one model call that writes prose. It receives ONLY the counted
// tallies and QA report — no videos, no raw ads — so it can phrase patterns
// but cannot invent claims with no tally behind them. Code renders all the
// numbers; this call supplies titles, takeaways, checklists, and tests.

import { z } from "zod";
import { EXPLAIN_MODEL } from "./constants";
import { chatJson } from "./openrouter";
import type { QaReport } from "./qa";
import type { Tally } from "./tally";

const countedLineSchema = z.object({
  text: z.string().describe("Plain imperative sentence for a creative strategist."),
  count: z.number().describe("Ads doing this, copied exactly from the tallies."),
  total: z.number().describe("Ads in the group, copied exactly from the tallies."),
});

const chapterProseSchema = z.object({
  formatLabel: z.string().describe("Must equal one of the tallied format labels."),
  title: z
    .string()
    .describe('A finding, not a category: "Show the coffee right away", never "Opening analysis".'),
  intro: z.string().describe("2-3 short sentences on how this format works in this market."),
  howToShoot: z.array(countedLineSchema).describe("4-6 imperative checklist lines."),
  watchOut: z
    .string()
    .describe("One thing almost nobody in the pool does, phrased as a caution or opening."),
});

const testRecommendationSchema = z.object({
  title: z.string(),
  hypothesis: z.string().describe("One sentence: if we do X, we expect Y."),
  justification: z
    .string()
    .describe("The counted regularity or gap this test rests on, with its numbers."),
  winMetric: z.string().describe("The single metric that decides the test."),
  shotNotes: z.array(z.string()).describe("3-5 concrete production notes."),
  risk: z.string().describe("The most likely way this test fails."),
  draftScript: z.string().describe("A 15-30 second script: hook line, beats, CTA."),
});

export const playbookProseSchema = z.object({
  takeaways: z.array(countedLineSchema).describe("The 3-5 most decision-relevant patterns."),
  chapters: z.array(chapterProseSchema),
  tests: z.array(testRecommendationSchema).min(3).max(3),
});

export type PlaybookProse = z.infer<typeof playbookProseSchema>;

export async function explainTally(
  market: string,
  tally: Tally,
  qa: QaReport,
): Promise<PlaybookProse> {
  return chatJson({
    model: EXPLAIN_MODEL,
    schemaName: "playbook_prose",
    schema: playbookProseSchema,
    messages: [
      { role: "system", content: explainPrompt(market) },
      { role: "user", content: JSON.stringify({ tally, qa }, null, 2) },
    ],
  });
}

function explainPrompt(market: string): string {
  return [
    `You are writing a creative playbook for the "${market}" paid-social market, for a creative strategist who is not an engineer.`,
    "You receive counted tallies from a pool of long-running ads. These counts are the only evidence that exists.",
    "Rules:",
    "- Every count and total you write must be copied from the tallies. Never invent, extrapolate, or round numbers.",
    "- Write one chapter per tallied format, in the same order, using its exact formatLabel.",
    "- Chapter titles state a finding in plain words. Checklist lines are imperatives a filmmaker can follow.",
    "- No single ad is a winner. Patterns across the pool are the only conclusions allowed.",
    "- Exactly 3 test recommendations. Each must cite a counted regularity or a counted gap as its justification.",
    "- Plain language only. No marketing jargon, no methodology jargon, short sentences.",
  ].join("\n");
}
