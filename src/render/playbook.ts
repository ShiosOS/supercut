// Assembles the playbook: a single self-contained HTML file a strategist can
// read from file://, email, or print. All numbers come straight from the
// Tally; the model's prose only ever sits next to a count that code produced.

import type { PlaybookProse } from "../explain";
import type { QaReport } from "../qa";
import type { FormatTally, Tally } from "../tally";
import { THIN_CHAPTER_THRESHOLD } from "../constants";
import { renderAppendix, type AppendixInput } from "./appendix";
import { banner, barChart, checklist, escapeHtml, frameStrip, statRow } from "./blocks";
import { PLAYBOOK_CSS } from "./style";

export interface ExemplarView {
  adId: string;
  brand: string;
  daysRunning: number;
  playCount: number;
  hookQuote: string;
  frameDataUrls: string[];
}

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
    .map((format, index) => renderChapter(input, format, index + 1))
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
We searched ${counts.searched} ads in this market and kept the ones running 30+ days and seen in the last 30.
An AI watched each surviving ad and answered a fixed set of questions about it; code then counted the answers.
${counts.rejected} ads that turned out to sell something else were rejected — they are listed at the bottom.
No single ad is called a winner here. The findings are patterns that repeat across ${counts.admitted} ads from ${tally.brandCount} different brands.</p>
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

function renderChapter(input: PlaybookInput, format: FormatTally, number: number): string {
  const prose = chapterProse(input.prose, format.formatLabel);
  const exemplars = input.exemplarsByFormat[format.formatLabel] ?? [];
  const withFrames = exemplars.filter((exemplar) => exemplar.frameDataUrls.length > 0);
  const thin =
    format.adIds.length < THIN_CHAPTER_THRESHOLD
      ? banner(`Only ${format.adIds.length} ads fit this format — read this chapter as a hint, not a rule.`)
      : "";

  return `<section id="chapter-${number}">
<p class="chapter-number">Chapter ${number} · ${escapeHtml(format.formatLabel)}</p>
<h2>${escapeHtml(prose?.title ?? format.formatLabel)}</h2>
<div class="meta-row">
  <span><b>${format.adIds.length}</b> ads</span>
  <span><b>${format.brandCount}</b> brands</span>
  <span><b>${format.medianDaysRunning}</b> median days live</span>
  <span><b>${format.medianMeasuredCutsFirst10s}</b> median cuts in first 10s</span>
</div>
${thin}
<p>${escapeHtml(prose?.intro ?? "")}</p>
${withFrames.length > 0 ? `<h3>The first three seconds, side by side</h3>${frameStrip(withFrames.map(exemplarFigure))}` : ""}
${barChart(format.hookStyle, "How these ads open")}
${barChart(format.productOnScreen, "When the product first appears")}
${barChart(format.ctaStyle, "How they ask for the click")}
<h3>How to shoot it</h3>
${checklist(prose?.howToShoot ?? [])}
<h3>Examples that lasted</h3>
${exemplars.map(renderExemplarRow).join("")}
<h3>Watch out</h3>
<p>${escapeHtml(prose?.watchOut ?? "")}</p>
</section>`;
}

function exemplarFigure(exemplar: ExemplarView) {
  return {
    frameDataUrls: exemplar.frameDataUrls,
    quote: exemplar.hookQuote,
    caption: `${exemplar.brand} · ${exemplar.daysRunning} days live`,
  };
}

function renderExemplarRow(exemplar: ExemplarView): string {
  const quote = exemplar.hookQuote ? `Opens with: “${escapeHtml(exemplar.hookQuote)}” · ` : "";
  return `<div class="exemplar"><span class="who">${escapeHtml(exemplar.brand)}</span><br>
${quote}${exemplar.daysRunning} days live · ${formatPlays(exemplar.playCount)} plays</div>`;
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

function formatPlays(playCount: number): string {
  if (playCount >= 1_000_000) return `${(playCount / 1_000_000).toFixed(1)}M`;
  if (playCount >= 1_000) return `${Math.round(playCount / 1_000)}k`;
  return String(playCount);
}
