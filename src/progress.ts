// Scan progress as a small JSON file on disk. The pipeline writes it after
// every stage; the web app polls it to show a live status line. Deliberately
// no PIDs and no job recovery — one scan per market at a time is the deal.

import { dataPaths, readJsonIfExists, writeJson } from "./dataDir";

export interface ScanProgress {
  market: string;
  stage: "searching" | "watching" | "counting" | "explaining" | "rendering" | "done" | "failed";
  detail: string;
  watched: number;
  toWatch: number;
  error?: string;
  updatedAt: string;
}

export async function writeProgress(progress: ScanProgress): Promise<void> {
  await writeJson(dataPaths.progress(progress.market), {
    ...progress,
    updatedAt: new Date().toISOString(),
  });
}

export async function readProgress(market: string): Promise<ScanProgress | null> {
  return readJsonIfExists<ScanProgress>(dataPaths.progress(market));
}
