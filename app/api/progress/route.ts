// GET /api/progress?market=<slug> — the scan's progress JSON, for polling.

import { NextResponse } from "next/server";
import { readProgress } from "@/progress";

export async function GET(request: Request) {
  const market = new URL(request.url).searchParams.get("market");
  if (!market) {
    return NextResponse.json({ error: "market is required" }, { status: 400 });
  }
  const progress = await readProgress(market);
  if (!progress) {
    return NextResponse.json({ error: "no scan found for this market" }, { status: 404 });
  }
  return NextResponse.json(progress);
}
