// The honesty appendix: what was thrown out and why, where the model measured
// noisy, and the assumptions the whole document rests on. This section exists
// so a reader can decide how much to trust every other section.

import type { QaReport } from "../qa";
import type { Tally } from "../tally";
import { escapeHtml } from "./blocks";

export interface AppendixInput {
  /** Ads the relevance gate rejected, with the model's stated reason. */
  rejections: { adId: string; brand: string; reason: string }[];
  /** Ads that never made it to the questionnaire (dead URL, too long, bad model output). */
  skips: { adId: string; brand: string; reason: string }[];
}

export function renderAppendix(input: AppendixInput, qa: QaReport, tally: Tally): string {
  return `<section id="appendix" class="appendix">
<h2>What to double-check</h2>
<p>Everything above comes from an AI watching ads one at a time and code counting its answers.
Here is where that process was noisy, and what it threw out.</p>

<h3>Ads rejected as off-market (${input.rejections.length})</h3>
<p>The search also returned ads selling something else. They were dropped before any counting, so they do not touch the numbers above.</p>
${rejectionTable(input.rejections)}

${input.skips.length > 0 ? skipsBlock(input.skips) : ""}

<h3>How reliable was the watching?</h3>
<p>We measured the editing pace of every ad twice: once by the AI's eye, once by scene-detection software.
The AI was off by ${qa.cutEstimate.meanAbsoluteError.toFixed(1)} cuts on average, and within 2 cuts of the software on ${Math.round(qa.cutEstimate.shareWithin2 * 100)}% of ads.
The cut counts printed in the chapters are the software's, not the AI's.</p>
${hookQuoteBlock(qa)}
${ctaDiscrepancyBlock(qa, tally)}
${lowConfidenceBlock(qa, tally)}

<h3>Assumptions this report makes</h3>
<ul class="checklist">
<li>"Still delivering" means the ad was seen in the ad library within the last 30 days. The data offers no direct "currently live" flag.</li>
<li>Days-running and play counts come from the ad library and are taken at face value.</li>
<li>A long-running ad earned study, but nothing here proves any single ad was profitable. Only the repeated patterns are conclusions.</li>
<li>Spoken quotes were transcribed by the AI from the audio; where the ad library had its own transcript, we cross-checked (see above).</li>
</ul>
</section>`;
}

function rejectionTable(rejections: AppendixInput["rejections"]): string {
  if (rejections.length === 0) return "<p>Nothing was rejected in this run.</p>";
  const rows = rejections
    .map(
      (rejection) =>
        `<tr><td>${escapeHtml(rejection.brand)}</td><td>${escapeHtml(rejection.reason)}</td></tr>`,
    )
    .join("");
  return `<table><tr><th>Advertiser</th><th>Why it was dropped</th></tr>${rows}</table>`;
}

function skipsBlock(skips: AppendixInput["skips"]): string {
  const rows = skips
    .map((skip) => `<tr><td>${escapeHtml(skip.brand)}</td><td>${escapeHtml(skip.reason)}</td></tr>`)
    .join("");
  return `<h3>Ads we could not analyze (${skips.length})</h3>
<p>These never reached the questionnaire, so they are absent from every count.</p>
<table><tr><th>Advertiser</th><th>What went wrong</th></tr>${rows}</table>`;
}

function hookQuoteBlock(qa: QaReport): string {
  const { corroborated, contradicted, notCheckable, contradictedAdIds } = qa.hookQuotes;
  const checked = corroborated + contradicted;
  if (checked === 0) {
    return `<p>No hook quotes could be cross-checked in this pool (${notCheckable} ads had on-screen-text hooks, no hook, or no library transcript), so quotes rest on the AI's transcription alone.</p>`;
  }
  return `<p>Where a spoken hook could be checked against the ad library's own transcript (${checked} ads), the AI's quote matched ${corroborated} times and disagreed ${contradicted} time${contradicted === 1 ? "" : "s"}${contradictedAdIds.length > 0 ? ` (ad${contradictedAdIds.length === 1 ? "" : "s"} ${contradictedAdIds.map(escapeHtml).join(", ")})` : ""}.
The other ${notCheckable} ads had on-screen-text hooks, no hook, or no transcript — nothing to check against.</p>`;
}

function ctaDiscrepancyBlock(qa: QaReport, tally: Tally): string {
  if (qa.ctaDiscrepancy.count === 0) {
    return "<p>Every ad the AI described as making no ask also carries no purchase button — the two sources agree.</p>";
  }
  return `<p>${qa.ctaDiscrepancy.count} of ${tally.totalAds} ads were described by the AI as making no ask, yet the ad unit itself carries a purchase button (ad${qa.ctaDiscrepancy.count === 1 ? "" : "s"} ${qa.ctaDiscrepancy.adIds.map(escapeHtml).join(", ")}).
Read those "no ask" counts with that in mind: the AI judges the video, not the button under it.</p>`;
}

function lowConfidenceBlock(qa: QaReport, tally: Tally): string {
  if (qa.lowConfidenceFormatAdIds.length === 0) {
    return "<p>The AI reported firm format labels for every ad in the pool.</p>";
  }
  return `<p>${qa.lowConfidenceFormatAdIds.length} of ${tally.totalAds} ads got a format label the AI itself marked as low confidence. They stay in the counts but never appear as examples.</p>`;
}
