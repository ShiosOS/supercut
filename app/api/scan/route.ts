// POST /api/scan — spawns the scan script and returns immediately. The scan
// writes progress JSON that /api/progress reads. Deliberately no job table,
// no PID tracking, no stale-run recovery: one scan per market at a time.

import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { marketSlug } from "@/dataDir";
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
