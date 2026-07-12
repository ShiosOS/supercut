// Playbook page: the document itself in an iframe, a download link, and the
// brand brief generator underneath.

import { BriefForm } from "./briefForm";

export default async function PlaybookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = slug.replaceAll("-", " ");
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold capitalize tracking-tight">{market} playbook</h1>
        <a
          href={`/api/playbook/${slug}`}
          download={`${slug}-playbook.html`}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium transition hover:border-orange-700"
        >
          Download the file
        </a>
      </div>
      <iframe
        src={`/api/playbook/${slug}`}
        title={`${market} playbook`}
        className="h-[75vh] w-full rounded-lg border border-stone-200 bg-white shadow-sm"
      />
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-bold">Make it about your brand</h2>
        <p className="mt-1 text-sm text-stone-600">
          One sentence about your brand and product, and the three tests above get
          rewritten for it — using only the patterns this scan counted.
        </p>
        <BriefForm market={slug} />
      </section>
    </div>
  );
}
