# Decision log

Why the project is shaped the way it is. Each entry: the choice, the
alternatives seriously considered, and the trade-off that decided it.
What the system *is* lives in [architecture.md](architecture.md); this file is
only the *why*.

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
