// POST /api/scan — spawns the scan script and returns immediately; the scan
// writes progress JSON that /api/progress reads. DELETE /api/scan removes a
// finished scan's playbook and data. Deliberately no job table, no PID
// tracking, no stale-run recovery: one scan per market at a time.

import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { marketDir, marketSlug } from "@/dataDir";
import { readProgress } from "@/progress";

export async function POST(request: Request) {
  const { market } = (await request.json()) as { market?: string };
  if (!market?.trim()) {
    return NextResponse.json({ error: "market is required" }, { status: 400 });
  }
  if (!process.env.PIPISPY_API_KEY || !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "API keys are missing. Copy .env.example to .env and fill both keys." },
      { status: 400 },
    );
  }

  const slug = marketSlug(market);
  const existing = await readProgress(slug);
  if (existing && existing.stage !== "done" && existing.stage !== "failed") {
    return NextResponse.json({ slug }); // already running; just watch it
  }

  const child = spawn("bun", ["run", "src/scan.ts", slug], {
    cwd: process.cwd(),
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  return NextResponse.json({ slug });
}

export async function DELETE(request: Request) {
  const market = new URL(request.url).searchParams.get("market");
  if (!market) {
    return NextResponse.json({ error: "market is required" }, { status: 400 });
  }

  // marketSlug strips everything but [a-z0-9-], so the paths below cannot
  // escape the data/ and examples/ directories.
  const slug = marketSlug(market);
  const progress = await readProgress(slug);
  if (progress && progress.stage !== "done" && progress.stage !== "failed") {
    return NextResponse.json(
      { error: "This scan is still running — let it finish before deleting it." },
      { status: 409 },
    );
  }

  await rm(marketDir(slug), { recursive: true, force: true });
  await rm(path.join("examples", `${slug}.html`), { force: true });
  return NextResponse.json({ deleted: slug });
}
