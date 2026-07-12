"use client";

// The one-text-box scan form. Kicks off a scan and moves to its progress page.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ScanForm() {
  const router = useRouter();
  const [market, setMarket] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function startScan(event: React.FormEvent) {
    event.preventDefault();
    if (!market.trim() || starting) return;
    setStarting(true);
    setError(null);
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market: market.trim() }),
    });
    if (!response.ok) {
      setError((await response.json()).error ?? "could not start the scan");
      setStarting(false);
      return;
    }
    const { slug } = await response.json();
    router.push(`/scan/${slug}`);
  }

  return (
    <form onSubmit={startScan} className="mt-3 flex max-w-md gap-2">
      <input
        value={market}
        onChange={(event) => setMarket(event.target.value)}
        placeholder='a market, e.g. "coffee"'
        className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 outline-none focus:border-orange-700"
      />
      <button
        type="submit"
        disabled={starting}
        className="rounded-lg bg-orange-800 px-5 py-2.5 font-medium text-white transition hover:bg-orange-700 disabled:opacity-50"
      >
        {starting ? "Starting…" : "Scan"}
      </button>
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
