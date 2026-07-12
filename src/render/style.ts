// The playbook's entire stylesheet, inlined into the document so the file
// reads correctly from file://, over email, and printed to PDF.

export const PLAYBOOK_CSS = `
  :root { --ink: #1a1a1a; --muted: #6b6b6b; --line: #e5e2dc; --accent: #b4552d; --wash: #faf8f5; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    color: var(--ink); background: var(--wash);
    line-height: 1.55; padding: 48px 20px 80px;
  }
  main { max-width: 720px; margin: 0 auto; }
  .sans { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }
  .kicker { font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; font-size: 12px;
    letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px; }
  h1 { font-size: 44px; line-height: 1.1; margin-bottom: 10px; text-transform: capitalize; }
  .subtitle { font-size: 19px; color: var(--muted); margin-bottom: 6px; }
  .stamp { font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; font-size: 12px; color: var(--muted); }
  nav.toc { margin: 36px 0; padding: 18px 22px; background: #fff; border: 1px solid var(--line); border-radius: 8px; }
  nav.toc ol { margin-left: 20px; } nav.toc li { margin: 4px 0; }
  nav.toc a { color: var(--ink); }
  section { margin-top: 56px; }
  h2 { font-size: 28px; line-height: 1.2; margin-bottom: 14px; }
  h3 { font-size: 17px; margin: 26px 0 10px; }
  p { margin-bottom: 12px; max-width: 65ch; }
  .chapter-number { font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif;
    font-size: 13px; color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase; }
  .bignum { font-size: 40px; font-weight: 700; line-height: 1; color: var(--accent);
    font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; }
  .stat { display: flex; gap: 16px; align-items: baseline; padding: 14px 0; border-top: 1px solid var(--line); }
  .stat .claim { font-size: 17px; }
  .meta-row { display: flex; flex-wrap: wrap; gap: 10px 28px; margin: 14px 0 6px;
    font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; font-size: 13px; color: var(--muted); }
  .meta-row b { color: var(--ink); font-size: 15px; }
  .bar-row { display: grid; grid-template-columns: 170px 1fr 70px; gap: 10px; align-items: center;
    margin: 6px 0; font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; font-size: 13px; }
  .bar-track { display: block; background: #eeebe5; border-radius: 3px; height: 14px; }
  .bar-fill { display: block; background: var(--accent); opacity: .85; border-radius: 3px; height: 14px; }
  .bar-count { color: var(--muted); text-align: right; }
  ul.checklist { list-style: none; margin: 8px 0 16px; }
  ul.checklist li { padding: 8px 0 8px 26px; position: relative; border-top: 1px solid var(--line); }
  ul.checklist li::before { content: '→'; position: absolute; left: 2px; color: var(--accent); }
  .count-tag { font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif;
    font-size: 12px; color: var(--muted); white-space: nowrap; }
  .strip { margin: 18px 0 6px; }
  .strip figure { display: flex; flex-wrap: wrap; gap: 8px; }
  .strip img { width: calc(25% - 6px); min-width: 110px; flex: 1;
    border-radius: 6px; display: block; border: 1px solid var(--line); }
  .strip figcaption { font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif;
    font-size: 13px; color: var(--muted); margin-top: 8px; line-height: 1.4; width: 100%; }
  .strip figcaption q { font-style: italic; color: var(--ink); }
  .exemplar { padding: 12px 0; border-top: 1px solid var(--line); }
  .exemplar .who { font-weight: 700; }
  .banner { background: #fdf3e7; border: 1px solid #eed9bd; border-radius: 6px; padding: 10px 14px;
    font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; font-size: 13px; margin: 14px 0; }
  .test { background: #fff; border: 1px solid var(--line); border-radius: 8px; padding: 22px 24px; margin: 18px 0; }
  .test h3 { margin-top: 0; }
  .test dt { font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; font-size: 11px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-top: 12px; }
  .test dd { margin: 2px 0 0; }
  .script { white-space: pre-wrap; background: var(--wash); border-radius: 6px; padding: 12px 14px;
    font-size: 15px; margin-top: 4px; }
  .appendix { font-size: 15px; }
  .appendix table { border-collapse: collapse; width: 100%; margin: 10px 0 20px;
    font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; font-size: 13px; }
  .appendix th, .appendix td { text-align: left; padding: 6px 10px 6px 0; border-top: 1px solid var(--line); vertical-align: top; }
  .appendix th { color: var(--muted); font-weight: 600; }
  footer { margin-top: 64px; padding-top: 18px; border-top: 1px solid var(--line);
    font-family: -apple-system, 'Segoe UI', Helvetica, sans-serif; font-size: 12px; color: var(--muted); }
  @media print { body { background: #fff; padding: 0; } .strip { break-inside: avoid; } .test { break-inside: avoid; } }
`;
