"use client";

// The brand brief generator: one input, one API call, three rewritten tests.

import { useState } from "react";
import type { BrandBrief } from "@/brief";

export function BriefForm({ market }: { market: string }) {
  const [brand, setBrand] = useState("");
  const [brief, setBrief] = useState<BrandBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (!brand.trim() || loading) return;
    setLoading(true);
    setError(null);
    const response = await fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market, brand: brand.trim() }),
    });
    const payload = await response.json();
    if (!response.ok) setError(payload.error ?? "brief generation failed");
    else setBrief(payload as BrandBrief);
    setLoading(false);
  }

  return (
    <div className="mt-4">
      <form onSubmit={generate} className="flex gap-2">
        <input
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          placeholder='e.g. "Bloom, a small-batch mushroom coffee brand"'
          className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 outline-none focus:border-orange-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-orange-800 px-5 py-2.5 font-medium text-white transition hover:bg-orange-700 disabled:opacity-50"
        >
          {loading ? "Writing…" : "Write the brief"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {brief && (
        <div className="mt-6 space-y-4">
          <p className="text-stone-700">{brief.brandSummary}</p>
          <p className="text-stone-700">{brief.positioningNote}</p>
          {brief.tests.map((test) => (
            <div key={test.title} className="rounded-lg border border-stone-200 p-5">
              <h3 className="font-bold">{test.title}</h3>
              <p className="mt-2 text-sm text-stone-700">{test.concept}</p>
              <p className="mt-2 text-sm text-stone-500">Leans on: {test.patternUsed}</p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Opening line:</span> “{test.hookLine}”
              </p>
              <pre className="mt-3 whitespace-pre-wrap rounded bg-stone-50 p-3 text-sm">
                {test.draftScript}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
