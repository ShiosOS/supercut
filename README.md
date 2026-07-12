# Supercut

> A supercut of what's working in your market's ads — every pattern counted, every claim with receipts.

Type a market ("coffee", "protein powder"), get a self-contained HTML playbook of
what's working in that market's paid social video ads. AI watches each ad, code
counts the patterns, every claim comes with receipts.

**The point of view:** longevity is an admission filter, not a verdict.
Advertisers kill losing creative fast, so an ad still delivering after 30+ days
and active within the last 30 is worth studying. No single ad is ever called a
winner here — conclusions come only from counting regularities across the
admitted pool ("23 of 26 demo ads show the product in the first 3 seconds").

## How it thinks: describe → tally → explain

1. **Describe (AI):** a video model watches one ad at a time and fills out a fixed
   questionnaire. It never sees the other ads, so it cannot invent market patterns.
2. **Tally (code):** deterministic TypeScript counts the answers across the pool.
   Every stat keeps its contributing ad ids as receipts.
3. **Explain (AI):** one final model call phrases the counted patterns into
   chapters and test recommendations. It cannot cite a number that has no tally.

Built for the NewForm take-home. Full docs land with the code:
`docs/architecture.md` (what and where) and `docs/decisions.md` (why).
