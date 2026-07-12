// Assembles the playbook: a single self-contained HTML file a strategist can
// read from file://, email, or print. All numbers come straight from the
// Tally; the model's prose only ever sits next to a count that code produced.

import type { PlaybookProse } from "../explain";
import type { QaReport } from "../qa";
import type { Tally } from "../tally";
import { renderAppendix, type AppendixInput } from "./appendix";
import { barChart, escapeHtml, statRow } from "./blocks";
import { renderChapter, type ExemplarView } from "./chapter";
import { PLAYBOOK_CSS } from "./style";

export type { ExemplarView } from "./chapter";

export interface PlaybookInput {
  market: string;
  generatedAt: string;
  counts: { searched: number; candidates: number; watched: number; admitted: number; rejected: number };
  tally: Tally;
  prose: PlaybookProse;
  qa: QaReport;
  appendix: AppendixInput;
  /** Per format label: top study-score ads, at most one per brand. */
  exemplarsByFormat: Record<string, ExemplarView[]>;
  /** Printed verbatim in the footer so the ranking is inspectable. */
  studyScoreWeights: Record<string, number>;
  sampleBriefHtml?: string;
}

export function renderPlaybook(input: PlaybookInput): string {
  const { market, tally, prose, counts } = input;
  const chapters = tally.formats
    .map((format, index) =>
      renderChapter(
        format,
        chapterProse(prose, format.formatLabel),
        input.exemplarsByFormat[format.formatLabel] ?? [],
        index + 1,
      ),
    )
    .join("");
  const description =
    "Type a market, get a playbook of what's working in its paid social video ads. " +
    "AI watches each ad, code counts the patterns, every claim comes with receipts.";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${description}">
<title>${escapeHtml(market)} — creative playbook</title>
<style>${PLAYBOOK_CSS}</style>
</head>
<body><main>
<p class="kicker">Supercut · creative playbook</p>
<h1>${escapeHtml(market)}</h1>
<p class="subtitle">What the longest-running paid social video ads in this market keep doing — counted, with the footage to prove it.</p>
<p class="stamp">${escapeHtml(input.generatedAt)} · ${counts.admitted} ads studied across ${tally.brandCount} brands</p>

<section id="method">
<h2>How we picked these ads</h2>
<p>Advertisers kill losing ads fast, so an ad still delivering after a month has earned a look.
We searched ${counts.searched} ads in this market — including its heaviest spenders, so the pool reflects where real budgets go, not just what got views — and kept the ones running 30+ days and seen in the last 30.
An AI watched each surviving ad and answered a fixed set of questions about it; code then counted the answers.
${counts.rejected} ads that turned out to sell something else were rejected — they are listed at the bottom.
No single ad is called a winner here. The findings are patterns that repeat across ${counts.admitted} ads from ${tally.brandCount} different brands.</p>
${barChart(groupRareLabels(tally.segments), "What the studied ads sell")}
</section>

<section id="takeaways">
<h2>Top takeaways</h2>
${prose.takeaways.map((line) => statRow(line.count, line.total, line.text)).join("")}
</section>

${renderToc(input)}
${chapters}
${renderTests(prose)}
${input.sampleBriefHtml ?? ""}
${renderAppendix(input.appendix, input.qa, tally)}

<footer>
<p>Study ranking: ads are ordered for the example lists by a score of
${Object.entries(input.studyScoreWeights).map(([name, weight]) => `${name} ×${weight}`).join(" + ")},
each part normalized within this pool, with at most one ad per brand in any list.</p>
<p>Made with Supercut. Days-running and play counts come from the ad library data; "still delivering" means seen in the last 30 days, the closest signal the data offers to "currently live".</p>
</footer>
</main></body></html>`;
}

function renderToc(input: PlaybookInput): string {
  const items = input.tally.formats
    .map((format, index) => {
      const title = chapterProse(input.prose, format.formatLabel)?.title ?? format.formatLabel;
      return `<li><a href="#chapter-${index + 1}">${escapeHtml(title)}</a> <span class="count-tag">${format.formatLabel} · ${format.adIds.length} ads</span></li>`;
    })
    .join("");
  return `<nav class="toc"><ol>${items}<li><a href="#tests">What to test next</a></li><li><a href="#appendix">What to double-check</a></li></ol></nav>`;
}

function renderTests(prose: PlaybookProse): string {
  const cards = prose.tests
    .map(
      (test) => `<div class="test">
<h3>${escapeHtml(test.title)}</h3>
<dl>
<dt>Hypothesis</dt><dd>${escapeHtml(test.hypothesis)}</dd>
<dt>Why this test</dt><dd>${escapeHtml(test.justification)}</dd>
<dt>Call it on</dt><dd>${escapeHtml(test.winMetric)}</dd>
<dt>Shot notes</dt><dd><ul class="checklist">${test.shotNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul></dd>
<dt>Risk</dt><dd>${escapeHtml(test.risk)}</dd>
<dt>Draft script</dt><dd class="script">${escapeHtml(test.draftScript)}</dd>
</dl></div>`,
    )
    .join("");
  return `<section id="tests"><h2>What to test next</h2>${cards}</section>`;
}

function chapterProse(prose: PlaybookProse, formatLabel: string) {
  return prose.chapters.find((chapter) => chapter.formatLabel === formatLabel) ?? null;
}

/** Model-written segment labels have a long tail of one-offs; bundling them
 * keeps the segment chart readable. */
function groupRareLabels(segments: Tally["segments"]): Tally["segments"] {
  const common = segments.counts.filter((entry) => entry.count >= 2);
  const rare = segments.counts.filter((entry) => entry.count < 2);
  if (rare.length <= 1) return segments;
  return {
    total: segments.total,
    counts: [
      ...common,
      {
        label: `${rare.length} one-off segments`,
        count: rare.reduce((sum, entry) => sum + entry.count, 0),
        adIds: rare.flatMap((entry) => entry.adIds),
      },
    ],
  };
}
