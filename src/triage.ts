// Metadata triage: one cheap text-model call guesses from captions alone
// which candidates actually sell the market's products, so the expensive
// watch budget (download + video model) goes to likely ads first. Triage only
// orders the queue — the real relevance gate still judges every watched ad
// from the video itself.

import { z } from "zod";
import type { Ad } from "./ad";
import { EXPLAIN_MODEL } from "./constants";
import { chatJson } from "./openrouter";

const guessSchema = z.object({
  guesses: z.array(
    z.object({
      adId: z.string(),
      guess: z.enum(["likely", "unsure", "unlikely"]),
    }),
  ),
});

const GUESS_ORDER = { likely: 0, unsure: 1, unlikely: 2 } as const;

/** Returns the candidates reordered: likely on-market first, unlikely last.
 * If the triage call fails, the original order is kept — triage is an
 * optimization, never a gatekeeper. */
export async function triageByMetadata(market: string, candidates: Ad[]): Promise<Ad[]> {
  if (candidates.length === 0) return candidates;

  const listing = candidates.map((ad) => ({
    adId: ad.id,
    brand: ad.brand,
    caption: ad.description.slice(0, 200),
    button: ad.buttonText,
  }));

  let guesses: Map<string, keyof typeof GUESS_ORDER>;
  try {
    const result = await chatJson({
      model: EXPLAIN_MODEL,
      schemaName: "market_triage",
      schema: guessSchema,
      messages: [
        {
          role: "system",
          content: [
            `For each ad listing, guess whether the ad sells a product in the "${market}" market (the product itself or gear used with it).`,
            "You only see captions, so be generous: when the caption is vague or empty, answer 'unsure', not 'unlikely'.",
            "'unlikely' is for ads clearly selling something else (unrelated products, apps, courses, charities).",
            "Return a guess for every adId given.",
          ].join("\n"),
        },
        { role: "user", content: JSON.stringify(listing) },
      ],
    });
    guesses = new Map(result.guesses.map((entry) => [entry.adId, entry.guess]));
  } catch (error) {
    console.error(`  triage failed, keeping original order: ${error instanceof Error ? error.message : error}`);
    return candidates;
  }

  return [...candidates].sort(
    (a, b) => GUESS_ORDER[guesses.get(a.id) ?? "unsure"] - GUESS_ORDER[guesses.get(b.id) ?? "unsure"],
  );
}
