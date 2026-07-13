"use client";

// Small × on each playbook card: confirms, deletes the scan's playbook and
// data through the API, and refreshes the list.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeletePlaybookButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const market = slug.replaceAll("-", " ");
    if (!confirm(`Delete the ${market} playbook and its scan data?`)) return;
    setBusy(true);
    const response = await fetch(`/api/scan?market=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      alert((await response.json()).error ?? "could not delete this scan");
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      aria-label={`Delete the ${slug} playbook`}
      title="Delete this playbook and its scan data"
      className="absolute right-3 top-3 rounded px-1.5 text-lg leading-none text-stone-300 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
    >
      ×
    </button>
  );
}
