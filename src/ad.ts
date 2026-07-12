// The normalized Ad type every pipeline stage speaks, and the mapper from
// PipiSpy's raw response shape into it. Provider quirks stop at this file.

import { z } from "zod";

/** One ad as the rest of the pipeline sees it. */
export interface Ad {
  /** Provider video_id — the stable id used in every receipt. */
  id: string;
  brand: string;
  platform: "tiktok" | "facebook";
  description: string;
  buttonText: string;
  coverUrl: string;
  videoUrl: string;
  durationSeconds: number;
  /** Provider-computed delivery days — the longevity signal. */
  daysRunning: number;
  /** Unix seconds. lastSeenAt is the recency proxy; there is no live flag. */
  firstSeenAt: number;
  lastSeenAt: number;
  playCount: number;
  likeCount: number;
  /** Provider ASR transcript. Often missing; corroboration only. */
  providerTranscript: string | null;
}

/** The PipiSpy list-item fields we rely on, validated at the API boundary. */
export const pipiSpyItemSchema = z.object({
  video_id: z.union([z.string(), z.number()]),
  app_name: z.string().nullish(),
  desc: z.string().nullish(),
  button_text: z.string().nullish(),
  cover: z.string().nullish(),
  video_url: z.string().nullish(),
  duration: z.number().nullish(),
  platform: z.number().nullish(),
  put_days: z.number().nullish(),
  ad_create_time: z.number().nullish(),
  last_put_time: z.number().nullish(),
  play_count: z.number().nullish(),
  digg_count: z.number().nullish(),
  ai_analysis_script: z.string().nullish(),
});

export type PipiSpyItem = z.infer<typeof pipiSpyItemSchema>;

/** Maps one raw PipiSpy item to an Ad. Returns null when the item lacks the
 * essentials (id, brand, playable video) rather than inventing placeholders. */
export function adFromPipiSpyItem(item: PipiSpyItem): Ad | null {
  if (!item.video_id || !item.app_name || !item.video_url) return null;
  return {
    id: String(item.video_id),
    brand: item.app_name,
    platform: item.platform === 1 ? "tiktok" : "facebook",
    description: item.desc ?? "",
    buttonText: item.button_text ?? "",
    coverUrl: item.cover ?? "",
    videoUrl: item.video_url,
    durationSeconds: item.duration ?? 0,
    daysRunning: item.put_days ?? 0,
    firstSeenAt: item.ad_create_time ?? 0,
    lastSeenAt: item.last_put_time ?? 0,
    playCount: item.play_count ?? 0,
    likeCount: item.digg_count ?? 0,
    providerTranscript: item.ai_analysis_script?.trim() || null,
  };
}
