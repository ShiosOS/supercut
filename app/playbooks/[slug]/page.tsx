// Playbook page: the report fills the viewport below a slim toolbar that
// holds the way back home, the download link, and the brand brief generator.

import Link from "next/link";
import { BriefForm } from "./briefForm";

export default async function PlaybookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = slug.replaceAll("-", " ");
  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-6 py-2.5">
        <div className="flex items-baseline gap-4">
          <Link href="/" className="text-sm text-stone-500 transition hover:text-stone-900">
            ← all playbooks
          </Link>
          <h1 className="text-base font-bold capitalize tracking-tight">{market} playbook</h1>
        </div>
        <div className="flex items-center gap-2">
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg bg-orange-800 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-orange-700">
              Make it about your brand
            </summary>
            <div className="absolute right-0 top-full z-10 mt-2 max-h-[75vh] w-[min(92vw,34rem)] overflow-auto rounded-lg border border-stone-200 bg-white p-5 shadow-xl">
              <p className="text-sm text-stone-600">
                One sentence about your brand and product, and the playbook&apos;s three tests get
                rewritten for it — using only the patterns this scan counted.
              </p>
              <BriefForm market={slug} />
            </div>
          </details>
          <a
            href={`/api/playbook/${slug}`}
            download={`${slug}-playbook.html`}
            className="rounded-lg border border-stone-300 bg-white px-4 py-1.5 text-sm font-medium transition hover:border-orange-700"
          >
            Download
          </a>
        </div>
      </div>
      <iframe
        src={`/api/playbook/${slug}`}
        title={`${market} playbook`}
        className="w-full flex-1 bg-white"
      />
    </div>
  );
}
