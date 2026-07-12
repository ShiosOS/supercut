// Stage 1: pull candidate ads for a market from several biased angles, map
// them to the shared Ad type, and keep only ads that pass the admission
// filter: 30+ days delivering and seen within the last 30.

import { z } from "zod";
import { adFromPipiSpyItem, type Ad } from "./ad";
import {
  ADS_PER_SEARCH_ANGLE,
  CONSUMER_PRODUCT_MARKET,
  EXPLAIN_MODEL,
  MAX_ADS_SEARCHED,
  MAX_DAYS_SINCE_LAST_SEEN,
  MIN_DAYS_RUNNING,
} from "./constants";
import { chatJson } from "./openrouter";
import { searchAds, SORT, type SearchParams } from "./pipispy";

const DAY_SECONDS = 24 * 60 * 60;

export interface FindAdsResult {
  ads: Ad[];
  /** Total results returned across all search angles, before any filtering —
   * the honest denominator for "how we picked these ads". */
  searched: number;
}

export async function findAds(market: string): Promise<FindAdsResult> {
  // Rounded to the UTC day so the recency cutoff — and with it the search
  // cache key — is stable across re-runs on the same day. A cutoff computed
  // from the exact second would miss the cache and re-spend credits.
  const startOfTodayUtc = Math.floor(Date.now() / 1000 / DAY_SECONDS) * DAY_SECONDS;
  const lastSeenAfter = startOfTodayUtc - MAX_DAYS_SINCE_LAST_SEEN * DAY_SECONDS;
  const shared = {
    pageSize: ADS_PER_SEARCH_ANGLE,
    lastSeenAfter,
    minDaysRunning: MIN_DAYS_RUNNING,
    productMarket: CONSUMER_PRODUCT_MARKET,
  };

  // One sort order is one bias; combine four rankings of the broad keyword
  // with two tighter product-keyword pulls, then dedupe by ad id. The
  // ad-spend stratum strengthens the admission thesis from "ran a long time"
  // to "ran a long time with real money behind it".
  const subKeywords = await suggestSubKeywords(market);
  const angles: SearchParams[] = [
    { keyword: market, keywordType: 1, sort: SORT.engagement, ...shared },
    { keyword: market, keywordType: 1, sort: SORT.deliveryDays, ...shared },
    { keyword: market, keywordType: 1, sort: SORT.lastFound, ...shared },
    { keyword: market, keywordType: 1, sort: SORT.adSpend, ...shared },
    ...subKeywords.map(
      (keyword): SearchParams => ({ keyword, keywordType: 5, sort: SORT.engagement, ...shared }),
    ),
  ];

  const seen = new Map<string, Ad>();
  let searched = 0;
  for (const angle of angles) {
    if (searched >= MAX_ADS_SEARCHED) break;
    const items = await searchAds(market, angle);
    searched += items.length;
    for (const item of items) {
      const ad = adFromPipiSpyItem(item);
      if (ad && passesAdmission(ad, lastSeenAfter) && !seen.has(ad.id)) {
        seen.set(ad.id, ad);
      }
    }
    console.log(
      `  findAds: "${angle.keyword}" sort=${angle.sort} → pool now ${seen.size} ads (${searched} searched)`,
    );
  }
  return { ads: [...seen.values()], searched };
}

/** The admission filter, restated in code: longevity earns study, recency
 * proxies "still delivering". The API already filters, but responses are
 * cached and providers drift — never trust a boundary you can re-check. */
function passesAdmission(ad: Ad, lastSeenAfter: number): boolean {
  return ad.daysRunning >= MIN_DAYS_RUNNING && ad.lastSeenAt >= lastSeenAfter;
}

const subKeywordsSchema = z.object({
  keywords: z.array(z.string()).describe("Exactly 2 concrete product phrases."),
});

/** Asks a text model for two concrete product phrases inside the market
 * (e.g. "coffee" → "espresso machine", "coffee pods") so the pull isn't
 * hostage to how sellers word the broad keyword. */
async function suggestSubKeywords(market: string): Promise<string[]> {
  const result = await chatJson({
    model: EXPLAIN_MODEL,
    schemaName: "sub_keywords",
    schema: subKeywordsSchema,
    messages: [
      {
        role: "user",
        content:
          `List exactly 2 concrete product search phrases a shopper would use inside the "${market}" market. ` +
          "Each 1-3 words, distinct product types, no brand names.",
      },
    ],
  });
  return result.keywords.slice(0, 2);
}
