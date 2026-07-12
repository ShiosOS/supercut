"use client";

// Polls /api/progress every few seconds and renders the scan's stage line.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ScanProgress } from "@/progress";

const STAGE_LINES: Record<ScanProgress["stage"], string> = {
  searching: "Pulling candidate ads from the ad library…",
  watching: "Watching each ad and filling out its questionnaire…",
  counting: "Counting patterns across the pool…",
  explaining: "Writing chapters from the counted patterns…",
  rendering: "Assembling the playbook…",
  done: "Done.",
  failed: "The scan failed.",
};

export function ProgressWatcher({ slug }: { slug: string }) {
  const router = useRouter();
  const [progress, setProgress] = useState<ScanProgress | null>(null);

  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch(`/api/progress?market=${encodeURIComponent(slug)}`);
      if (!response.ok) return;
      const latest = (await response.json()) as ScanProgress;
      setProgress(latest);
      if (latest.stage === "done") {
        clearInterval(timer);
        router.push(`/playbooks/${slug}`);
      }
      if (latest.stage === "failed") clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [slug, router]);

  if (!progress) return <p className="mt-4 text-stone-600">Waiting for the scan to report in…</p>;

  const percent =
    progress.stage === "watching" && progress.toWatch > 0
      ? Math.round((progress.watched / progress.toWatch) * 100)
      : null;

  return (
    <div className="mt-6 max-w-md space-y-3">
      <p className="font-medium">{STAGE_LINES[progress.stage]}</p>
      <p className="text-sm text-stone-600">{progress.detail}</p>
      {percent !== null && (
        <div className="h-2 overflow-hidden rounded bg-stone-200">
          <div className="h-2 bg-orange-700 transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}
      {progress.stage === "failed" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {progress.error}
        </p>
      )}
      <p className="text-xs text-stone-400">
        A full scan takes 20–60 minutes. You can close this page; the scan keeps going.
      </p>
    </div>
  );
}
