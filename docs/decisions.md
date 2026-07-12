# Decision log

Why the project is shaped the way it is. Each entry: the choice, the
alternatives seriously considered, and the trade-off that decided it.
What the system _is_ lives in [architecture.md](architecture.md); this file is
only the _why_.

## Longevity as admission filter, not verdict

**Choice:** an ad qualifies for study if it has run 30+ days and was seen in the
last 30. Nothing about any single ad is treated as proof it "works".

**Alternatives:** rank by plays or engagement (rewards big budgets and viral
flukes, not creative quality); use provider "top ad" sorts (opaque, single-bias).

**Trade-off:** survival is the one signal advertisers pay for with their own
money — losing creative gets killed fast. But survival of one ad can still be
noise (brand inertia, a forgotten campaign), so conclusions come only from
counting regularities across the whole admitted pool.

## Describe → tally → explain

**Choice:** AI describes single ads through a fixed questionnaire, plain code
counts the answers, and a final AI call phrases the counts. The model that
watches videos never sees two ads at once; the model that writes prose never
sees a video.

**Alternative:** hand all the ads to one big model call and ask "what patterns
do you see?" — fast to build, impossible to audit, and prone to confident
market-level claims with no evidence behind them.

**Trade-off:** three stages cost more code than one prompt. In exchange, every
number in the playbook is reproducible from the questionnaires on disk, and any
claim can be spot-checked against the ads that produced it.

## PipiSpy as the ad data source

**Choice:** PipiSpy's adspy list API. Facts established empirically against the
live API (the docs are a JS app, so fields were verified by pulling):

- POST `https://www.pipispy.com/open-api/v1/data` with body
  `{ key, uri: "/v3/api/open/adspy/list", params }`.
- Items at `data.data[]`; `video_id` is the ad id, `put_days` the longevity
  signal, `last_put_time` the recency signal. There is **no "currently live"
  flag** — recency via `last_put_time` is a stated proxy.
- Pricing is 1 credit per result returned, so every raw search response is
  cached on disk keyed by a hash of its params; re-runs never re-spend credits.
- `sort_type` must be the string `"asc"`/`"desc"` (the API rejects numbers with
  a 400), and failed requests still return HTTP 200 with `success: false` — so
  the client checks the body, not the status code.
- `ai_analysis_script` is their ASR transcript: no timestamps, often missing —
  used only to corroborate hook quotes, never as a primary source.

**Alternative:** Foreplay's public API. PipiSpy was chosen because its delivery
metadata (`put_days`) maps directly onto the longevity filter.

## ffmpeg for mechanical facts (recon-verified)

**Choice:** cut counts, hook frames, and fingerprint inputs come from ffmpeg,
not the model. Verified locally on ffmpeg 6.1.1 before any pipeline code:

- Scene-cut detection via `select='gt(scene,0.4)'` + `metadata=print` found all
  3 cuts in a synthetic 4-scene clip at their exact timestamps.
- Hook frames as 320px webp at quality 70 land around 4 KB each — small enough
  to embed dozens as base64 in a single self-contained playbook file.
- An 8×8 grayscale raw frame (64 bytes) is enough for an average-hash
  perceptual fingerprint, used to collapse re-uploads of the same creative.

## The relevance gate earns its keep

**Finding (recon):** the very first "coffee" keyword pull returned a lip-balm
ad as its top engagement result — the transcript happened to mention coffee.
Keyword search over ad libraries leaks constantly (courses, recipes, unrelated
products that mention the market word).

**Choice:** the questionnaire asks what each ad actually sells and the gate
drops off-market ads before any counting, reporting each rejection with its
reason in the playbook appendix. Noise becomes a visible, measured step
instead of silent contamination.

## Pre-filter at the API, keep the gate

**Finding (first full coffee run):** roughly 60% of the search credits went to
ads the relevance gate later dropped — keyword search alone returns games,
apps, charity appeals, and merchandise.

**Choice:** for consumer-product markets, every list pull now adds
`data_type: [3]` (e-commerce ads only) and `is_product: true` (a real product
attached), both verified against the live API. This moves most of the cut
upstream, before credits and watch budget are spent. The model-side relevance
gate stays — it is the last line of defense, and still catches e-commerce ads
that sell the wrong product (coffee tables in a coffee scan). The flag is one
constant (`CONSUMER_PRODUCT_MARKET`), not a provider abstraction: an app
market would flip it to `is_app` by hand.

## The ad-spend stratum

**Choice:** a fourth sort order, the provider's ad-spend estimate (`sort: 21`),
joins engagement, delivery days, and recency. Longevity says an ad kept
running; spend says someone kept paying for it. Together the admission thesis
becomes "ran a long time with real money behind it", which the playbook
methodology states in plain words.

## Shares weigh more than plays in the study score

**Choice:** the engagement component now ranks by plays plus 100× shares
(`SHARE_WORTH_IN_PLAYS`). A play is often an accident of the feed; a share is
a deliberate endorsement of the creative. The multiplier is printed in every
playbook footnote so the ranking stays inspectable.

## The detail endpoint: wired for exemplar permalinks only

**Finding (recon):** `adspy/detail` (free within 3 days of the list pull that
surfaced the ad, 1 credit otherwise) returns one field the list lacks that
the playbook can actually use: `url`, a public permalink to the live ad post.
The rest is noise for this tool's purposes: the `ai_analysis` block
duplicates the list's transcript, the audience/age fields came back empty on
sampled ads, and `ad_fee` — which looks like a spend estimate — is
`play_count / 1000` on 30 of 33 sampled ads. That is a formula, not delivery
data, so printing it as "estimated spend" would be fake precision and it is
not used.

**Choice:** fetch detail only for exemplar ads (the handful shown as
examples), cache it per ad id, and render the permalink ("watch the ad") in
the example rows. A live link is the strongest receipt a playbook can offer.
Detail is not fetched for the rest of the pool — nothing in the tallies uses
it, so it would be spend without a reader benefit.

## Scoped out: advertiser-anchored scans and Meta reach data

Two capabilities were verified against the API surface and deliberately cut:

- **Advertiser-anchored market scans.** Keyword type 3 searches by
  advertiser, and `rank/top-advertiser/list` plus the store-analysis
  endpoints could turn "who are the players" into the scan's spine (top
  advertisers → their ads → their stores). Valuable — but it is a different
  product (competitor intelligence) and a second navigation model; the
  keyword scan already fills the pool this tool needs.
- **Meta Ad Library reach data.** `lib-ads/list` exposes
  `ad_audience_reach` and `active_days` — real delivery figures, stronger
  than play counts. But it is a second data model to normalize into `Ad`,
  and mixing "reach" rows with "plays" rows would quietly break the
  pool-wide comparisons the tallies depend on. One consistent, weaker metric
  beats two inconsistent ones inside a single document.

## Roadmap items verified, then cut

Each "Where this goes next" bullet in the README was checked against the real
API surface before being written down — image-similarity search, ad monitor
tasks, and the store ad-schedule / longest-running-creative endpoints all
exist and are priced. They are roadmap, not promises: each one adds a new
interaction model (visual search, subscriptions, per-brand pages) that would
dilute the single-document product this build set out to prove.

## Credit spend for the param upgrade

Changed search params mean new cache keys, so both markets were re-pulled
once with the pre-filters and spend stratum. Credits went from 38,385 before
the re-pull to 37,929 after both markets — 456 credits for two markets at up
to 240 searched ads each (some angles returned short pages), with the
exemplar detail calls landing inside their free window. The old-param caches
were left in place but are no longer read; nothing re-pulls with old params.

## Metadata triage before the watch budget

**Finding (first full coffee run):** of 56 watched ads, the gate rejected 42 —
TikTok keyword search matches captions and transcripts, so "coffee" returns
mugs, furniture, skincare, and charity appeals. Only 14 relevant ads survived,
a thin pool. The tighter keyword type (e-commerce product) was tried and
returned even less relevant results, so more searching was not the fix.

**Choice:** one cheap text-model call guesses relevance from captions alone
and sorts the watch queue likely-first. Triage only orders the queue; the real
gate still judges every watched ad from the video. If triage fails, the
original order is kept. This roughly tripled the relevant yield of the same
70-video watch budget.

## One video model, coarse claims only

**Choice:** `google/gemini-3-flash-preview` via OpenRouter (video accepted as a
base64 `data:video/mp4` URL part, roughly $0.002 per ad). Its content
perception and verbatim speech reading are reliable; its visual-event
timestamps drift 2–5 seconds. So the questionnaire asks for what happened, not
when to the second — see the time-bins entry below. Videos over 180 seconds are
skipped: they cost disproportionately and are rarely the repeatable paid-social
unit this tool studies.

## Coarse time bins instead of second-precise timestamps

**Choice:** the questionnaire reports visual timing in bins (first 3 seconds /
3–10 seconds / later / never).

**Why:** video-model timestamps drift 2–5 seconds in practice. Reporting
"product appears at 2.4s" would be fake precision. Bins are coarse enough to be
trustworthy and fine enough to matter (the first 3 seconds are the scroll-stop
window). Mechanical facts that need precision — cut counts in the first 10
seconds — come from ffmpeg scene detection, not the model.

## Videos are transient

**Choice:** each video is streamed to a temp file, fingerprinted, frame-grabbed,
cut-counted, and described in one window, then deleted. Only small derived
artifacts (JSON + compressed webp hook frames) are kept in `data/`.

**Why:** the videos are not ours to store, and keeping them would bloat the
repo and the cache for no analytical gain. Everything the playbook needs
survives in the derived artifacts.
