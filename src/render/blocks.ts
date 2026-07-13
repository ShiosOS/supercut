// The small HTML building blocks the playbook is assembled from: escaping,
// big-number stats, distribution bars, checklists, and frame strips.

import type { Distribution } from "../tally";

export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** A count set large with its claim in plain words next to it. */
export function statRow(count: number, total: number, claim: string): string {
  return `<div class="stat"><span class="bignum">${count}<span style="font-size:20px;color:var(--muted)"> of ${total}</span></span><span class="claim">${escapeHtml(claim)}</span></div>`;
}

/** A distribution as simple horizontal bars — no chart, no legend. */
export function barChart(distribution: Distribution, title: string): string {
  const rows = distribution.counts
    .map((entry) => {
      const percent = Math.round((entry.count / distribution.total) * 100);
      return `<div class="bar-row"><span>${escapeHtml(entry.label)}</span><span class="bar-track"><span class="bar-fill" style="width:${percent}%"></span></span><span class="bar-count">${entry.count} of ${distribution.total}</span></div>`;
    })
    .join("");
  return `<h3>${escapeHtml(title)}</h3>${rows}`;
}

export function checklist(lines: { text: string; count: number; total: number }[]): string {
  const items = lines
    .map(
      (line) =>
        `<li>${escapeHtml(line.text)} <span class="count-tag">(${line.count} of ${line.total} ads)</span></li>`,
    )
    .join("");
  return `<ul class="checklist">${items}</ul>`;
}

export interface FrameStripFigure {
  frameDataUrls: string[];
  caption: string;
  quote: string;
  /** Public permalink to the featured ad, when the provider has one. */
  adUrl: string | null;
}

/** The literal supercut: hook frames from exemplar ads, side by side, with
 * the spoken hook underneath and a link out to the featured creative.
 * Evidence sits next to the claim it supports. */
export function frameStrip(figures: FrameStripFigure[]): string {
  return figures
    .map((figure) => {
      const images = figure.frameDataUrls
        .map((url) => `<img src="${url}" alt="hook frame">`)
        .join("");
      const caption = figure.quote
        ? `<q>${escapeHtml(figure.quote)}</q> — ${escapeHtml(figure.caption)}`
        : escapeHtml(figure.caption);
      const link = figure.adUrl ? ` · ${externalLink(figure.adUrl, "watch the ad")}` : "";
      return `<div class="strip"><figure>${images}<figcaption>${caption}${link}</figcaption></figure></div>`;
    })
    .join("");
}

/** Links in a report open in a new tab — readers are mid-document. */
export function externalLink(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}

export function banner(text: string): string {
  return `<div class="banner">${escapeHtml(text)}</div>`;
}
