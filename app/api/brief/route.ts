// POST /api/brief — rewrites the market's three tests as a brief for the
// caller's brand, constrained to the tallies the scan already counted.

import { NextResponse } from "next/server";
import { generateBrandBrief } from "@/brief";
import { dataPaths, marketSlug, readJsonIfExists } from "@/dataDir";
import type { PlaybookProse } from "@/explain";
import type { Tally } from "@/tally";

interface StoredTallies {
  tally: Tally;
  prose: PlaybookProse;
}

export async function POST(request: Request) {
  const { market, brand } = (await request.json()) as { market?: string; brand?: string };
  if (!market?.trim() || !brand?.trim()) {
    return NextResponse.json({ error: "market and brand are required" }, { status: 400 });
  }
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is missing, so briefs cannot be generated." },
      { status: 400 },
    );
  }

  const stored = await readJsonIfExists<StoredTallies>(dataPaths.tallies(marketSlug(market)));
  if (!stored) {
    return NextResponse.json(
      { error: "No scan data for this market on this machine — run a scan first." },
      { status: 404 },
    );
  }

  const brief = await generateBrandBrief(market, brand.trim(), stored.tally, stored.prose);
  return NextResponse.json(brief);
}
