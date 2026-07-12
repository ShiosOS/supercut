// The per-ad watch step: download the video once, and in that one window
// fingerprint it, count cuts, grab hook frames, and run the questionnaire.
// The video is deleted before the next ad; everything derived is cached so a
// re-run never downloads or re-describes an ad it has already seen.

import type { Ad } from "./ad";
import { MAX_VIDEO_MEGABYTES, MAX_VIDEO_SECONDS, SCENE_CUT_THRESHOLD } from "./constants";
import { dataPaths, readJsonIfExists, writeJson } from "./dataDir";
import { describeAd, readCachedFactSheet } from "./describe";
import {
  countCutsFirst10s,
  extractHookFrames,
  fingerprintVideo,
  probeDuration,
  withVideo,
  type Fingerprint,
} from "./media";
import type { AdFacts } from "./tally";

export type WatchOutcome =
  | { status: "watched"; facts: AdFacts; fingerprint: Fingerprint }
  | { status: "skipped"; adId: string; brand: string; reason: string };

interface Mechanicals {
  fingerprint: Fingerprint;
  measuredCutsFirst10s: number;
  /** Cut counts depend on the detection threshold; a cached count measured
   * with a different threshold must be re-measured, not trusted. */
  sceneCutThreshold: number;
}

type MechanicalsFile = Record<string, Mechanicals>;

export async function watchAd(market: string, ad: Ad): Promise<WatchOutcome> {
  if (ad.durationSeconds > MAX_VIDEO_SECONDS) {
    return skipped(ad, `video is ${Math.round(ad.durationSeconds)}s, over the ${MAX_VIDEO_SECONDS}s limit`);
  }

  const cached = await readFromCache(market, ad);
  if (cached) return cached;

  try {
    return await withVideo(ad.videoUrl, async (videoPath) => {
      const durationSeconds = await probeDuration(videoPath);
      if (durationSeconds > MAX_VIDEO_SECONDS) {
        return skipped(ad, `video is ${Math.round(durationSeconds)}s, over the ${MAX_VIDEO_SECONDS}s limit`);
      }
      const megabytes = (await Bun.file(videoPath).bytes()).length / 1024 / 1024;
      if (megabytes > MAX_VIDEO_MEGABYTES) {
        return skipped(ad, `video file is ${megabytes.toFixed(0)}MB, over the ${MAX_VIDEO_MEGABYTES}MB limit`);
      }
      const fingerprint = await fingerprintVideo(videoPath);
      const measuredCutsFirst10s = await countCutsFirst10s(videoPath);
      await extractHookFrames(videoPath, (index) => dataPaths.hookFrame(market, ad.id, index));
      const factSheet = await describeAd(market, ad, videoPath);
      await saveMechanicals(market, ad.id, {
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
    // reported in the playbook's appendix instead.
    return skipped(ad, error instanceof Error ? error.message : String(error));
  }
}

async function readFromCache(market: string, ad: Ad): Promise<WatchOutcome | null> {
  const factSheet = await readCachedFactSheet(market, ad.id);
  if (!factSheet) return null;
  const mechanicalsFile = await readJsonIfExists<MechanicalsFile>(dataPaths.mechanicals(market));
  const mechanicals = mechanicalsFile?.[ad.id];
  if (!mechanicals || mechanicals.sceneCutThreshold !== SCENE_CUT_THRESHOLD) return null;
  return {
    status: "watched",
    facts: { ad, factSheet, measuredCutsFirst10s: mechanicals.measuredCutsFirst10s },
    fingerprint: mechanicals.fingerprint,
  };
}

async function saveMechanicals(market: string, adId: string, mechanicals: Mechanicals): Promise<void> {
  const path = dataPaths.mechanicals(market);
  const file = (await readJsonIfExists<MechanicalsFile>(path)) ?? {};
  file[adId] = mechanicals;
  await writeJson(path, file);
}

function skipped(ad: Ad, reason: string): WatchOutcome {
  return { status: "skipped", adId: ad.id, brand: ad.brand, reason };
}
