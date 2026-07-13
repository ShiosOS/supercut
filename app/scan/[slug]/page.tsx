// Scan progress page: polls the progress JSON and moves to the playbook when
// the scan finishes.

import Link from "next/link";
import { ProgressWatcher } from "./progressWatcher";

export default async function ScanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-stone-500 transition hover:text-stone-900">
        ← all playbooks
      </Link>
      <h1 className="mt-3 text-2xl font-bold capitalize tracking-tight">
        Scanning {slug.replaceAll("-", " ")}
      </h1>
      <ProgressWatcher slug={slug} />
    </div>
  );
}
