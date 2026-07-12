// Scan progress page: polls the progress JSON and moves to the playbook when
// the scan finishes.

import { ProgressWatcher } from "./progressWatcher";

export default async function ScanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <div>
      <h1 className="text-2xl font-bold capitalize tracking-tight">
        Scanning {slug.replaceAll("-", " ")}
      </h1>
      <ProgressWatcher slug={slug} />
    </div>
  );
}
