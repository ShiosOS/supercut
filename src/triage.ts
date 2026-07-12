// Metadata triage: cheap text-model calls guess from captions alone which
// candidates actually sell the market's products, so the expensive watch
// budget (download + video model) goes to likely ads first. Triage only
// orders the queue — the real relevance gate still judges every watched ad
// from the video itself.

import { z } from "zod";
import type { Ad } from "./ad";
import { EXPLAIN_MODEL } from "./constants";
import { chatJson } from "./openrouter";

/** Candidates triaged per model call. One call over ~200 ads spends ~20s
 * decoding output tokens serially; four chunked calls run in parallel. */
const TRIAGE_CHUNK_SIZE = 50;

const guessSchema = z.object({
  guesses: z.array(
    z.object({
      adId: z.string(),
      guess: z.enum(["likely", "unsure", "unlikely"]),
    }),
  ),
});

const GUESS_ORDER = { likely: 0, unsure: 1, unlikely: 2 } as const;
type Guess = keyof typeof GUESS_ORDER;

/** Returns the candidates reordered: likely on-market first, unlikely last.
 * If a triage call fails, its chunk keeps the neutral "unsure" order —
 * triage is an optimization, never a gatekeeper. */
export async function triageByMetadata(market: string, candidates: Ad[]): Promise<Ad[]> {
  if (candidates.length === 0) return candidates;

  const chunks: Ad[][] = [];
  for (let start = 0; start < candidates.length; start += TRIAGE_CHUNK_SIZE) {
    chunks.push(candidates.slice(start, start + TRIAGE_CHUNK_SIZE));
  }
  const chunkGuesses = await Promise.all(chunks.map((chunk) => guessChunk(market, chunk)));

  const guesses = new Map<string, Guess>();
  for (const chunkResult of chunkGuesses) {
    for (const [adId, guess] of chunkResult) guesses.set(adId, guess);
  }
  return [...candidates].sort(
    (a, b) =>
      GUESS_ORDER[guesses.get(a.id) ?? "unsure"] - GUESS_ORDER[guesses.get(b.id) ?? "unsure"],
  );
}

async function guessChunk(market: string, chunk: Ad[]): Promise<Map<string, Guess>> {
  const listing = chunk.map((ad) => ({
    adId: ad.id,
    brand: ad.brand,
    caption: ad.description.slice(0, 200),
    button: ad.buttonText,
  }));

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
    return new Map(result.guesses.map((entry) => [entry.adId, entry.guess]));
  } catch (error) {
    console.error(
      `  triage chunk failed, keeping neutral order: ${error instanceof Error ? error.message : error}`,
    );
    return new Map();
  }
}
