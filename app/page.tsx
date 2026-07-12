// Home: the finished playbooks, and a one-text-box form to scan a new market.

import { readdirSync } from "node:fs";
import Link from "next/link";
import { ScanForm } from "./scanForm";

export const dynamic = "force-dynamic";

function listPlaybooks(): string[] {
  try {
    return readdirSync("examples")
      .filter((name) => name.endsWith(".html"))
      .map((name) => name.replace(/\.html$/, ""))
      .sort();
  } catch {
    return [];
  }
}

export default function HomePage() {
  const playbooks = listPlaybooks();
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">
          Type a market. Get the playbook.
        </h1>
        <p className="mt-3 max-w-xl text-stone-600">
          Supercut studies the paid social video ads that kept running when the rest got
          killed, counts what they keep doing, and writes it up with the footage to prove
          it — plus three tests to run next.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Finished playbooks
        </h2>
        {playbooks.length === 0 ? (
          <p className="mt-2 text-stone-600">None yet — scan a market below.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {playbooks.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/playbooks/${slug}`}
                  className="block rounded-lg border border-stone-200 bg-white px-5 py-4 font-medium capitalize shadow-sm transition hover:border-orange-700 hover:shadow"
                >
                  {slug.replaceAll("-", " ")}
                  <span className="mt-1 block text-sm font-normal text-stone-500">
                    open playbook →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          Scan a new market
        </h2>
        <ScanForm />
        <p className="mt-3 text-sm text-stone-500">
          A scan pulls ~200 ads, watches up to 70 videos, and takes 20–60 minutes.
          Needs PIPISPY_API_KEY and OPENROUTER_API_KEY in .env.
        </p>
      </section>
    </div>
  );
}
