// Everything that touches a video file: download to a temp path, fingerprint,
// count cuts, grab hook frames. Videos are transient — each one lives only for
// the duration of withVideo() and is deleted before the next ad.

import { createHash } from "node:crypto";
import { mkdirSync, rmSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  CUT_WINDOW_SECONDS,
  HOOK_FRAME_TIMESTAMPS,
  HOOK_FRAME_WEBP_QUALITY,
  HOOK_FRAME_WIDTH_PX,
  SCENE_CUT_THRESHOLD,
} from "./constants";

/** Downloads a video, hands its temp path to `use`, deletes it afterwards.
 * Downloads go through curl: Bun's fetch intermittently hung against the ad
 * CDN mid-scan, while curl proved reliable — and --max-time guarantees a
 * stuck download skips one ad instead of stalling the run. */
export async function withVideo<T>(
  videoUrl: string,
  use: (videoPath: string) => Promise<T>,
): Promise<T> {
  const dir = mkdtempSync(path.join(tmpdir(), "supercut-"));
  const videoPath = path.join(dir, "ad.mp4");
  try {
    const proc = Bun.spawn(
      [
        "curl",
        "--silent",
        "--fail",
        "--location",
        "--max-time",
        "120",
        "--output",
        videoPath,
        videoUrl,
      ],
      { stdout: "ignore", stderr: "ignore" },
    );
    const exitCode = await proc.exited;
    if (exitCode !== 0) throw new Error(`video download failed (curl exit ${exitCode})`);
    return await use(videoPath);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Identity of the creative itself, independent of the ad id it was posted
 * under. Used to collapse re-uploads of the same video. */
export interface Fingerprint {
  sha256: string;
  /** 64-bit average hash of the middle frame, as 16 hex chars. */
  perceptualHash: string;
  durationSeconds: number;
}

export async function fingerprintVideo(videoPath: string): Promise<Fingerprint> {
  const bytes = await Bun.file(videoPath).bytes();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const durationSeconds = await probeDuration(videoPath);
  const gray = await midFrameGray8x8(videoPath, durationSeconds / 2);
  return { sha256, perceptualHash: averageHash(gray), durationSeconds };
}

/** Hard cuts in the first 10 seconds, via ffmpeg scene detection. This is the
 * mechanical ground truth the model's own cut estimate is QA'd against. */
export async function countCutsFirst10s(videoPath: string): Promise<number> {
  const output = await runFfmpeg([
    "-t",
    String(CUT_WINDOW_SECONDS),
    "-i",
    videoPath,
    "-vf",
    `select='gt(scene,${SCENE_CUT_THRESHOLD})',metadata=print:file=-`,
    "-fps_mode",
    "passthrough",
    "-f",
    "null",
    "-",
  ]);
  return output.split("\n").filter((line) => line.includes("pts_time")).length;
}

/** Grabs the hook frames (first 3 seconds) as small webp files at the given
 * destination paths. Returns the paths that were actually written. */
export async function extractHookFrames(
  videoPath: string,
  destinationFor: (index: number) => string,
): Promise<string[]> {
  const written: string[] = [];
  for (const [index, timestamp] of HOOK_FRAME_TIMESTAMPS.entries()) {
    const destination = destinationFor(index);
    mkdirSync(path.dirname(destination), { recursive: true });
    await runFfmpeg([
      "-ss",
      String(timestamp),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-vf",
      `scale=${HOOK_FRAME_WIDTH_PX}:-1`,
      "-quality",
      String(HOOK_FRAME_WEBP_QUALITY),
      "-y",
      destination,
    ]);
    if (await Bun.file(destination).exists()) written.push(destination);
  }
  return written;
}

export async function probeDuration(videoPath: string): Promise<number> {
  const proc = Bun.spawn(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", videoPath],
    { stdout: "pipe", stderr: "ignore" },
  );
  const text = await new Response(proc.stdout).text();
  return Number.parseFloat(text.trim()) || 0;
}

async function midFrameGray8x8(videoPath: string, atSeconds: number): Promise<Uint8Array> {
  const dir = mkdtempSync(path.join(tmpdir(), "supercut-hash-"));
  const rawPath = path.join(dir, "frame.raw");
  try {
    await runFfmpeg([
      "-ss",
      String(atSeconds),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=8:8,format=gray",
      "-f",
      "rawvideo",
      "-y",
      rawPath,
    ]);
    return await Bun.file(rawPath).bytes();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function averageHash(gray: Uint8Array): string {
  const mean = gray.reduce((sum, value) => sum + value, 0) / gray.length;
  let bits = 0n;
  for (const value of gray) bits = (bits << 1n) | (value > mean ? 1n : 0n);
  return bits.toString(16).padStart(16, "0");
}

async function runFfmpeg(args: string[]): Promise<string> {
  const proc = Bun.spawn(["ffmpeg", "-loglevel", "info", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) throw new Error(`ffmpeg failed: ${stderr.slice(-400)}`);
  return stdout + stderr;
}
