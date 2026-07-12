// Renders one format chapter: the finding-as-title, the counted
// distributions, the frame strip of exemplars, and the shoot checklist.

import { THIN_CHAPTER_THRESHOLD } from "../constants";
import type { PlaybookProse } from "../explain";
import type { FormatTally } from "../tally";
import { banner, barChart, checklist, escapeHtml, frameStrip } from "./blocks";

export interface ExemplarView {
  adId: string;
  brand: string;
  daysRunning: number;
  playCount: number;
  hookQuote: string;
  frameDataUrls: string[];
  /** Public permalink to the live ad — the strongest receipt available. */
  adUrl: string | null;
  /** Provider's spend estimate in USD, when available. */
  estimatedSpendUsd: number | null;
}

type ChapterProse = PlaybookProse["chapters"][number];

export function renderChapter(
  format: FormatTally,
  prose: ChapterProse | null,
  exemplars: ExemplarView[],
  number: number,
): string {
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
  const spend =
    exemplar.estimatedSpendUsd && exemplar.estimatedSpendUsd > 0
      ? ` · ~$${compactNumber(exemplar.estimatedSpendUsd)} est. spend`
      : "";
  const link = exemplar.adUrl
    ? ` · <a href="${escapeHtml(exemplar.adUrl)}">watch the ad</a>`
    : "";
  return `<div class="exemplar"><span class="who">${escapeHtml(exemplar.brand)}</span><br>
${quote}${exemplar.daysRunning} days live · ${compactNumber(exemplar.playCount)} plays${spend}${link}</div>`;
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}
