// Renders a brand brief as a playbook section. Used by the pipeline to embed
// a clearly-labeled sample brief in shipped example playbooks; the web app
// generates live briefs through its own page instead.

import type { BrandBrief } from "../brief";
import { escapeHtml } from "./blocks";

export function renderBriefBlock(brandLine: string, brief: BrandBrief): string {
  const tests = brief.tests
    .map(
      (test) => `<div class="test">
<h3>${escapeHtml(test.title)}</h3>
<dl>
<dt>The idea</dt><dd>${escapeHtml(test.concept)}</dd>
<dt>The pattern it leans on</dt><dd>${escapeHtml(test.patternUsed)}</dd>
<dt>Opening line</dt><dd>“${escapeHtml(test.hookLine)}”</dd>
<dt>Draft script</dt><dd class="script">${escapeHtml(test.draftScript)}</dd>
</dl></div>`,
    )
    .join("");

  return `<section id="sample-brief">
<h2>Sample brand brief</h2>
<div class="banner">This section shows the brief generator on a made-up brand: “${escapeHtml(brandLine)}”.
In the app, you type your own brand and the tests below are rewritten for it.</div>
<p>${escapeHtml(brief.brandSummary)}</p>
<p>${escapeHtml(brief.positioningNote)}</p>
${tests}
</section>`;
}
