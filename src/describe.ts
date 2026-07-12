// Stage 3: one video model watches ONE ad and fills out the FactSheet
// questionnaire. It never sees other ads, so it cannot claim market-level
// patterns — that is the tally's job. Results are cached per ad with a schema
// version so a questionnaire change invalidates stale answers.

import { DESCRIBE_MODEL, FACT_SHEET_SCHEMA_VERSION } from "./constants";
import type { Ad } from "./ad";
import { factSheetSchema, type FactSheet, type StoredFactSheet } from "./factSheet";
import { dataPaths, readJsonIfExists, writeJson } from "./dataDir";
import { chatJson } from "./openrouter";

/** Returns the cached questionnaire for this ad, or null if it must be
 * (re)described — because it was never described or the schema moved on. */
export async function readCachedFactSheet(
  market: string,
  adId: string,
): Promise<FactSheet | null> {
  const stored = await readJsonIfExists<StoredFactSheet>(dataPaths.factSheet(market, adId));
  if (!stored || stored._schemaVersion !== FACT_SHEET_SCHEMA_VERSION) return null;
  const parsed = factSheetSchema.safeParse(stored.factSheet);
  return parsed.success ? parsed.data : null;
}

/** Watches one downloaded video and fills out the questionnaire. */
export async function describeAd(
  market: string,
  ad: Ad,
  videoPath: string,
): Promise<FactSheet> {
  const videoBytes = await Bun.file(videoPath).bytes();
  const videoDataUrl = `data:video/mp4;base64,${Buffer.from(videoBytes).toString("base64")}`;

  const factSheet = await chatJson({
    model: DESCRIBE_MODEL,
    schemaName: "ad_fact_sheet",
    schema: factSheetSchema,
    messages: [
      { role: "system", content: questionnairePrompt(market) },
      {
        role: "user",
        content: [
          { type: "text", text: `Ad caption: "${ad.description}". Button: "${ad.buttonText}".` },
          { type: "video_url", video_url: { url: videoDataUrl } },
        ],
      },
    ],
  });

  const stored: StoredFactSheet = {
    _schemaVersion: FACT_SHEET_SCHEMA_VERSION,
    adId: ad.id,
    model: DESCRIBE_MODEL,
    factSheet,
  };
  await writeJson(dataPaths.factSheet(market, ad.id), stored);
  return factSheet;
}

function questionnairePrompt(market: string): string {
  return [
    "You are analyzing ONE paid social video ad. Answer the questionnaire about this ad only.",
    `The market being studied is "${market}".`,
    "Rules:",
    `- marketFit: "core product" only if the ad sells the ${market} product itself; "adjacent product" for gear or accessories used with it; "off-market" for everything else (courses, recipes, unrelated goods). Judge by what is sold, not what is shown.`,
    "- spokenHookQuote must be VERBATIM from the audio or on-screen text. Empty string if neither exists.",
    "- Report timing only in the coarse options given. Do not guess precise seconds.",
    "- estimatedCutsFirst10s: count hard cuts you can actually see in the first 10 seconds.",
    "- If unsure about the format, pick the closest label and set formatConfidence accordingly.",
  ].join("\n");
}
