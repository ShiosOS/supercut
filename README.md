# Supercut

> A supercut of what's working in your market's ads — every pattern counted, every claim with receipts.

**Open a finished playbook first:** [coffee](examples/coffee.html) ·
[protein powder](examples/protein-powder.html) — download and open in a
browser, no setup or keys needed.

Supercut takes a market name and produces a self-contained HTML playbook of
what that market's paid social video ads keep doing: format chapters with
counted patterns, hook-frame strips from the ads themselves, and three tests
to run next, each with a draft script. It's built for a creative strategist
or founder who needs to brief a shoot, not read a data dump.

**The point of view:** longevity is an admission filter, not a verdict.
Advertisers kill losing creative fast, so an ad still delivering after 30+
days — and seen in the last 30 — has earned study. The search strata include
the market's heaviest spenders, so "still delivering" means real money kept
backing the ad, not just that it lingered. No single ad is ever called a
winner; conclusions come only from counting regularities across the admitted
pool ("34 of 39 ads show the product in the first 3 seconds").

## How it thinks: describe → tally → explain

1. **Describe (AI):** a video model watches one ad at a time and fills out a
   fixed questionnaire. It never sees the other ads, so it cannot invent
   market-level patterns.
2. **Tally (code):** deterministic TypeScript counts the answers across the
   pool. Every count keeps its contributing ad ids as receipts.
3. **Explain (AI):** one final call phrases the counted patterns into chapters
   and tests. It sees only the tallies, so it cannot cite a number that has no
   count behind it.

## Run it

```bash
bun install
cp .env.example .env   # add PIPISPY_API_KEY and OPENROUTER_API_KEY

bun run scan coffee    # writes examples/coffee.html (20–60 min, ~200 API credits)
bun run dev            # web app: browse playbooks, start scans, generate brand briefs
```

`ffmpeg` must be on PATH. Deterministic modules are tested: `bun test`.

## Limits, stated plainly

- "Still delivering" is a proxy: the ad library has no live flag, so recency
  of `last_put_time` stands in for it.
- Survival says an ad kept earning spend, not that it was profitable.
- The video model's visual timestamps drift 2–5 seconds, so timing is reported
  in coarse bins (first 3s / 3–10s / later), and cut counts come from ffmpeg,
  not the model. Each playbook's appendix measures where the model was noisy.
- One market, one snapshot. Patterns are what's working now, not laws.

## What I didn't build and why

- **A whitespace finder.** "Nobody does X" needs census-level coverage, and a
  gap can mean "tried and died" as easily as "opportunity". The playbook flags
  what almost nobody in the pool does — as an observation with a count, not as
  advice to charge in.
- **Winners vs losers comparison.** The library shows when ads stopped being
  seen, but dead ≠ failed (campaigns end, budgets move). Longevity as an
  admission filter uses the trustworthy half of that signal.
- **A full strategist copilot (chat, scoring dashboards, asset generation).**
  Three products in a trenchcoat. One document a strategist can act on beats
  all three half-done.

## How I used AI

In the product: a video model fills a fixed per-ad questionnaire (`describe`);
a text model orders the watch queue by caption relevance (`triage`), phrases
counted tallies (`explain`), and adapts tests to a brand (`brief`). Every
model output is schema-validated; drift is measured against ffmpeg and the
provider's transcripts in each playbook's appendix. In the process: this repo
was built with an AI coding agent doing the implementation, with the design,
architecture rules, and quality bar specified up front and enforced by review,
plus recon runs against the live APIs before the pipeline was written.

Built for the NewForm take-home. Depth lives in
[docs/architecture.md](docs/architecture.md) (what and where) and
[docs/decisions.md](docs/decisions.md) (why).

Suggested GitHub repo description (repo owner: set under Settings → About):
*Type a market, get a playbook of what's working in its paid social video ads.
AI watches each ad, code counts the patterns, every claim comes with receipts.*
