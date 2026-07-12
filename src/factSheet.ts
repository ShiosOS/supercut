// The fixed questionnaire one video model fills out per ad — the only thing AI
// is allowed to say about a single ad. Kept JSON-Schema-safe (plain enums,
// strings, numbers, booleans) so one Zod schema is the LLM contract, the
// runtime validator, and the static type.

import { z } from "zod";

export const FORMAT_LABELS = [
  "product demo",
  "creator testimonial",
  "founder on camera",
  "ugc problem-solution",
  "screen-record demo",
  "before-after",
  "still image with text",
  "lifestyle montage",
  "other",
] as const;

export const HOOK_STYLES = [
  "question",
  "bold claim",
  "problem callout",
  "curiosity tease",
  "social proof",
  "offer or discount",
  "visual hook",
  "other",
] as const;

export const factSheetSchema = z.object({
  whatItSells: z
    .string()
    .describe("One sentence: the actual product or service this ad sells."),
  marketFit: z
    .enum(["core product", "adjacent product", "off-market"])
    .describe(
      "core product = the market's product itself; adjacent product = gear or accessories for it; off-market = anything else (courses, recipes, unrelated goods).",
    ),
  segment: z
    .string()
    .describe(
      "Short product segment label within the market, lowercase, 1-3 words (e.g. 'beans & pods', 'brewing equipment'). 'n/a' if off-market.",
    ),
  formatLabel: z.enum(FORMAT_LABELS),
  formatConfidence: z
    .enum(["high", "medium", "low"])
    .describe("How cleanly the ad fits the chosen format label."),
  hookStyle: z.enum(HOOK_STYLES),
  spokenHookQuote: z
    .string()
    .describe(
      "Verbatim first spoken or on-screen-text line of the hook. Empty string if there is none.",
    ),
  firstThreeSeconds: z
    .string()
    .describe("What literally happens on screen in the first 3 seconds, one sentence."),
  productOnScreen: z
    .enum(["first 3 seconds", "3 to 10 seconds", "later", "never"])
    .describe("When the product first clearly appears on screen."),
  creatorVsBrandFeel: z
    .enum(["creator", "brand", "mixed"])
    .describe("Does it feel like a person's phone video or a produced brand asset?"),
  demoClarity: z
    .enum(["full demo", "glimpse", "no demo"])
    .describe("How clearly the product is shown being used."),
  ctaStyle: z.enum(["hard", "soft", "none"]),
  pacing: z.enum(["fast", "medium", "slow"]),
  estimatedCutsFirst10s: z
    .number()
    .describe("Your estimate of hard cuts in the first 10 seconds."),
  emotionalTone: z.enum([
    "energetic",
    "calm",
    "humorous",
    "aspirational",
    "urgent",
    "sincere",
    "neutral",
  ]),
  worksWithSoundOff: z
    .boolean()
    .describe("Could a viewer follow the pitch with audio muted?"),
  audienceCue: z
    .string()
    .describe("Who the ad seems aimed at, in a few words (e.g. 'busy parents')."),
});

export type FactSheet = z.infer<typeof factSheetSchema>;

/** A FactSheet as cached on disk, with provenance for invalidation and QA. */
export interface StoredFactSheet {
  _schemaVersion: number;
  adId: string;
  model: string;
  factSheet: FactSheet;
}
