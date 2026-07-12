// GET /api/playbook/<slug> — serves the finished playbook HTML for viewing
// in an iframe or downloading as a file.

import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { marketSlug } from "@/dataDir";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const safeSlug = marketSlug(slug);
  try {
    const html = await readFile(path.join("examples", `${safeSlug}.html`), "utf8");
    return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  } catch {
    return NextResponse.json({ error: "no playbook for this market" }, { status: 404 });
  }
}
