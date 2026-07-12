// Turns the market's counted patterns into a creative brief for one specific
// brand. Same constraint as the explain stage: the model sees only the
// tallies and tests, so the brief adapts proven patterns instead of inventing
// new claims about the market.

import { z } from "zod";
import { EXPLAIN_MODEL } from "./constants";
import type { PlaybookProse } from "./explain";
import { chatJson } from "./openrouter";
import type { Tally } from "./tally";

const briefTestSchema = z.object({
  title: z.string(),
  concept: z.string().describe("2-3 sentences: the ad, described for this specific brand."),
  patternUsed: z.string().describe("The counted market pattern this leans on, with its numbers."),
  hookLine: z.string().describe("The opening line, written for this brand's product."),
  draftScript: z.string().describe("A 15-30 second script: hook, beats, CTA."),
});

export const brandBriefSchema = z.object({
  brandSummary: z.string().describe("One sentence restating the brand and product."),
  positioningNote: z
    .string()
    .describe("2-3 sentences: where this brand can fit the market's proven patterns."),
  tests: z.array(briefTestSchema).min(3).max(3),
});

export type BrandBrief = z.infer<typeof brandBriefSchema>;

export async function generateBrandBrief(
  market: string,
  brandLine: string,
  tally: Tally,
  prose: PlaybookProse,
): Promise<BrandBrief> {
  return chatJson({
    model: EXPLAIN_MODEL,
    schemaName: "brand_brief",
    schema: brandBriefSchema,
    messages: [
      {
        role: "system",
        content: [
          `You adapt counted patterns from the "${market}" paid-social market into a creative brief for one brand.`,
          "You receive the market tallies and three market-level test ideas.",
          "Rules:",
          "- Rewrite the three tests for this brand's specific product. Keep each test's counted justification, with its numbers, in patternUsed.",
          "- Never invent market statistics. Every number must come from the tallies.",
          "- Plain language for a creative strategist. Short sentences.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({ brand: brandLine, tally, marketTests: prose.tests }),
      },
    ],
  });
}
