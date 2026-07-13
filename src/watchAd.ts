// The per-ad watch step: download the video once, and in that one window
// fingerprint it, count cuts, grab hook frames, and run the questionnaire.
// The video is deleted when done; everything derived is cached so a re-run
// never downloads or re-describes an ad it has already seen. Ads are watched
// in parallel, so mechanicals live in a shared in-memory map the entrypoint
// loads and persists once — no concurrent read-modify-write on one file.

import type { Ad } from "./ad";
import { MAX_VIDEO_MEGABYTES, MAX_VIDEO_SECONDS, SCENE_CUT_THRESHOLD } from "./constants";
import { dataPaths } from "./dataDir";
import { describeAd, readCachedFactSheet } from "./describe";
import {
  countCutsFirst10s,
  extractHookFrames,
  fingerprintVideo,
  probeDuration,
  VideoUnavailableError,
  withVideo,
  type Fingerprint,
} from "./media";
import type { AdFacts } from "./tally";

export type WatchOutcome =
  | { status: "watched"; facts: AdFacts; fingerprint: Fingerprint }
  | {
      status: "skipped";
      adId: string;
      brand: string;
      /** Plain language — this line goes into the report's appendix. */
      reason: string;
      /** Technical detail for the scan log only. */
      detail?: string;
    };

export interface Mechanicals {
  fingerprint: Fingerprint;
  measuredCutsFirst10s: number;
  /** Cut counts depend on the detection threshold; a cached count measured
   * with a different threshold must be re-measured, not trusted. */
  sceneCutThreshold: number;
}

export type MechanicalsCache = Map<string, Mechanicals>;

export async function watchAd(
  market: string,
  ad: Ad,
  mechanicalsCache: MechanicalsCache,
): Promise<WatchOutcome> {
  if (ad.durationSeconds > MAX_VIDEO_SECONDS) {
    return skipped(ad, tooLongReason(ad.durationSeconds));
  }

  const cached = await readFromCache(market, ad, mechanicalsCache);
  if (cached) return cached;

  try {
    return await withVideo(ad.videoUrl, async (videoPath) => {
      const durationSeconds = await probeDuration(videoPath);
      if (durationSeconds > MAX_VIDEO_SECONDS) {
        return skipped(ad, tooLongReason(durationSeconds));
      }
      const megabytes = (await Bun.file(videoPath).bytes()).length / 1024 / 1024;
      if (megabytes > MAX_VIDEO_MEGABYTES) {
        return skipped(
          ad,
          "the video file is too large to analyze",
          `${megabytes.toFixed(0)}MB, over the ${MAX_VIDEO_MEGABYTES}MB limit`,
        );
      }
      const fingerprint = await fingerprintVideo(videoPath);
      const measuredCutsFirst10s = await countCutsFirst10s(videoPath);
      await extractHookFrames(videoPath, (index) => dataPaths.hookFrame(market, ad.id, index));
      const factSheet = await describeAd(market, ad, videoPath);
      mechanicalsCache.set(ad.id, {
        fingerprint,
        measuredCutsFirst10s,
        sceneCutThreshold: SCENE_CUT_THRESHOLD,
      });
      return {
        status: "watched" as const,
        facts: { ad, factSheet, measuredCutsFirst10s },
        fingerprint,
      };
    });
  } catch (error) {
    // One dead URL or bad model reply must never kill the run; the skip is
    // reported in the playbook's appendix instead — in plain words, with the
    // technical detail kept for the scan log.
    return skipped(
      ad,
      plainSkipReason(error),
      error instanceof Error ? error.message : String(error),
    );
  }
}

/** Appendix lines are read by strategists, not engineers: say what happened
 * to the ad, never what a tool printed. */
function plainSkipReason(error: unknown): string {
  if (error instanceof VideoUnavailableError) {
    return "the ad's video is no longer available to download";
  }
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("ffmpeg") || message.startsWith("ffprobe")) {
    return "the video file could not be read";
  }
  return "the AI did not return a usable reading of this ad";
}

function tooLongReason(durationSeconds: number): string {
  return `the video runs ${Math.round(durationSeconds)} seconds — longer than the short-form ads this report studies`;
}

async function readFromCache(
  market: string,
  ad: Ad,
  mechanicalsCache: MechanicalsCache,
): Promise<WatchOutcome | null> {
  const factSheet = await readCachedFactSheet(market, ad.id);
  if (!factSheet) return null;
  const mechanicals = mechanicalsCache.get(ad.id);
  if (!mechanicals || mechanicals.sceneCutThreshold !== SCENE_CUT_THRESHOLD) return null;
  return {
    status: "watched",
    facts: { ad, factSheet, measuredCutsFirst10s: mechanicals.measuredCutsFirst10s },
    fingerprint: mechanicals.fingerprint,
  };
}

function skipped(ad: Ad, reason: string, detail?: string): WatchOutcome {
  return { status: "skipped", adId: ad.id, brand: ad.brand, reason, detail };
}
