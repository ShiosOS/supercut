// PipiSpy API client. Every search response is cached on disk keyed by a hash
// of its params, because PipiSpy charges 1 credit per result returned —
// re-running a scan must never re-spend credits.

import { createHash } from "node:crypto";
import { z } from "zod";
import { pipiSpyItemSchema, type PipiSpyItem } from "./ad";
import { dataPaths, readJsonIfExists, writeJson } from "./dataDir";

const API_URL = "https://www.pipispy.com/open-api/v1/data";
const LIST_URI = "/v3/api/open/adspy/list";

/** Sort orders the list endpoint accepts. Each one is a different bias, so
 * findAds pulls several and dedupes rather than trusting any single ranking. */
export const SORT = { lastFound: 1, plays: 4, deliveryDays: 5, engagement: 6 } as const;

export interface SearchParams {
  keyword: string;
  /** 1 = broad ad keyword, 5 = e-commerce product (tighter). */
  keywordType: 1 | 5;
  sort: (typeof SORT)[keyof typeof SORT];
  pageSize: number;
  /** Only ads seen delivering after this unix time. */
  lastSeenAfter: number;
  minDaysRunning: number;
}

const responseSchema = z.object({
  data: z.object({
    data: z.array(z.unknown()),
    remaining_credits: z.number().nullish(),
  }),
});

/** Searches PipiSpy for video ads, serving from the disk cache when the same
 * params were pulled before. Returns raw items; ad.ts maps them to Ads. */
export async function searchAds(
  market: string,
  params: SearchParams,
): Promise<PipiSpyItem[]> {
  const body = {
    key: requireApiKey(),
    uri: LIST_URI,
    params: {
      extend_keywords: [{ type: params.keywordType, keyword: params.keyword }],
      formate_type: [1], // video ads only
      put_day_min: params.minDaysRunning,
      last_time_start: params.lastSeenAfter,
      region: ["US"],
      ad_language: ["en"],
      sort: params.sort,
      sort_type: 2,
      current_page: 1,
      page_size: params.pageSize,
    },
  };

  // Cache key covers everything except the API key.
  const hash = createHash("sha256")
    .update(JSON.stringify(body.params))
    .digest("hex")
    .slice(0, 16);
  const cachePath = dataPaths.searchCache(market, hash);

  const cached = await readJsonIfExists<{ items: unknown[] }>(cachePath);
  const rawItems = cached ? cached.items : await fetchFromApi(body, cachePath);

  return rawItems
    .map((item) => pipiSpyItemSchema.safeParse(item))
    .filter((result) => result.success)
    .map((result) => result.data);
}

async function fetchFromApi(
  body: { key: string; uri: string; params: Record<string, unknown> },
  cachePath: string,
): Promise<unknown[]> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`PipiSpy returned ${response.status}: ${await response.text()}`);
  }
  const parsed = responseSchema.parse(await response.json());
  const items = parsed.data.data;
  console.log(
    `  pipispy: ${items.length} results, ${parsed.data.remaining_credits ?? "?"} credits left`,
  );
  await writeJson(cachePath, { items });
  return items;
}

function requireApiKey(): string {
  const key = process.env.PIPISPY_API_KEY;
  if (!key) {
    throw new Error(
      "PIPISPY_API_KEY is not set. Copy .env.example to .env and add your key — without it there is no ad data to scan.",
    );
  }
  return key;
}
