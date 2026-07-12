// Fetches the PipiSpy detail record for one ad — used only for exemplar ads,
// where one field the list lacks earns its keep: a public permalink to the
// live ad, the strongest receipt a playbook can offer. (The detail's spend
// estimate turned out to be plays/1000 — a formula, not data — so it is not
// used; see decisions.md.) Detail calls are free within 3 days of the list
// pull and cached forever after, so re-renders never re-spend.

import path from "node:path";
import { z } from "zod";
import { marketDir, readJsonIfExists, writeJson } from "./dataDir";

const API_URL = "https://www.pipispy.com/open-api/v1/data";
const DETAIL_URI = "/v3/api/open/adspy/detail";

const detailResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      url: z.string().nullish(),
    })
    .nullish(),
});

export interface AdDetail {
  /** Public permalink to the ad post, when the provider has one. */
  adUrl: string | null;
}

export async function fetchAdDetail(market: string, adId: string): Promise<AdDetail> {
  const cachePath = path.join(marketDir(market), "details", `${adId}.json`);
  const cached = await readJsonIfExists<AdDetail>(cachePath);
  if (cached) return cached;

  const empty: AdDetail = { adUrl: null };
  const key = process.env.PIPISPY_API_KEY;
  if (!key) return empty;

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, uri: DETAIL_URI, params: { id: adId } }),
  });
  if (!response.ok) return empty;

  const parsed = detailResponseSchema.safeParse(await response.json());
  if (!parsed.success || !parsed.data.success || !parsed.data.data) return empty;

  const detail: AdDetail = {
    adUrl: parsed.data.data.url?.startsWith("http") ? parsed.data.data.url : null,
  };
  await writeJson(cachePath, detail);
  return detail;
}
