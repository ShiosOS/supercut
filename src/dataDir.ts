// Where every derived artifact lives on disk, in one place. The data/ tree
// holds only small JSON and compressed frames — never videos.

import { mkdirSync } from "node:fs";
import path from "node:path";

/** Lowercase, hyphenated market slug used for directory and file names. */
export function marketSlug(market: string): string {
  return market.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function marketDir(market: string): string {
  return path.join("data", marketSlug(market));
}

export const dataPaths = {
  searchCache: (market: string, hash: string) =>
    path.join(marketDir(market), "searches", `${hash}.json`),
  pool: (market: string) => path.join(marketDir(market), "pool.json"),
  factSheet: (market: string, adId: string) =>
    path.join(marketDir(market), "factSheets", `${adId}.json`),
  mechanicals: (market: string) => path.join(marketDir(market), "mechanicals.json"),
  hookFrame: (market: string, adId: string, index: number) =>
    path.join(marketDir(market), "frames", adId, `${index}.webp`),
  tallies: (market: string) => path.join(marketDir(market), "tallies.json"),
  progress: (market: string) => path.join(marketDir(market), "progress.json"),
};

export async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  return (await file.json()) as T;
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  mkdirSync(path.dirname(filePath), { recursive: true });
  await Bun.write(filePath, JSON.stringify(value, null, 2));
}
