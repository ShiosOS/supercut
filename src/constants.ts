// Every threshold in the pipeline, in one place, each with the reason it holds
// that value. Change a number here and every stage follows.

/** An ad must have delivered at least this long to be worth studying.
 * Advertisers kill losing creative fast; surviving a month is the signal. */
export const MIN_DAYS_RUNNING = 30;

/** ...and must have been seen delivering within this window. PipiSpy has no
 * "currently live" flag, so recency of `last_put_time` is the stated proxy. */
export const MAX_DAYS_SINCE_LAST_SEEN = 30;

/** Cap per brand so one heavy advertiser cannot dominate the pool's tallies. */
export const MAX_ADS_PER_BRAND = 4;

/** Ads requested per search angle. Each sort order is one bias; we pull
 * several angles and dedupe rather than trusting any single ranking. */
export const ADS_PER_SEARCH_ANGLE = 40;

/** Total search-result budget per market. PipiSpy charges 1 credit per result
 * returned, so this is also the credit ceiling for a scan. */
export const MAX_ADS_SEARCHED = 200;

/** Cap on videos actually downloaded and described. Watching is the expensive
 * step (bandwidth + model tokens); ~70 admitted ads is plenty to count from. */
export const MAX_ADS_WATCHED = 70;

/** Videos longer than this are skipped: they cost disproportionately and are
 * rarely the repeatable paid-social unit this tool studies. */
export const MAX_VIDEO_SECONDS = 180;

/** Downloaded files larger than this are skipped — the model call ships the
 * video as base64 in the request body, and oversized payloads get rejected. */
export const MAX_VIDEO_MEGABYTES = 40;

/** Below this many relevant ads, we refuse to write a playbook at all —
 * counting regularities in a handful of ads is astrology. */
export const MIN_ADS_FOR_PLAYBOOK = 10;

/** A format needs at least this many ads to earn a chapter. */
export const MIN_ADS_FOR_CHAPTER = 3;

/** Chapters under this many ads carry a "read as a hint, not a rule" banner. */
export const THIN_CHAPTER_THRESHOLD = 5;

/** Exemplars shown per chapter (frame strips), at most one per brand so the
 * visual evidence spans the market rather than one advertiser's style. */
export const MIN_EXEMPLARS_PER_CHAPTER = 2;
export const MAX_EXEMPLARS_PER_CHAPTER = 3;

/** ffmpeg scene-change threshold. 0.4 catches hard cuts without flagging
 * ordinary motion; verified against synthetic multi-scene clips. */
export const SCENE_CUT_THRESHOLD = 0.4;

/** Cut counting stops here — editing rhythm of the hook window is what the
 * playbook reports ("median cuts in the first 10 seconds"). */
export const CUT_WINDOW_SECONDS = 10;

/** Hook frames: timestamps inside the first 3 seconds (the scroll-stop
 * window), rendered small enough to embed dozens per playbook as base64. */
export const HOOK_FRAME_TIMESTAMPS = [0.3, 1.2, 2.1, 2.9];
export const HOOK_FRAME_WIDTH_PX = 320;
export const HOOK_FRAME_WEBP_QUALITY = 70;

/** Video-capable model for the per-ad questionnaire. Content perception is
 * reliable; visual timestamps drift 2–5s, hence coarse bins in the schema. */
export const DESCRIBE_MODEL = "google/gemini-3-flash-preview";

/** Text model for the final explain call and brand briefs. */
export const EXPLAIN_MODEL = "google/gemini-3-flash-preview";

/** Bump when the FactSheet schema changes shape; cached questionnaires with an
 * older version are re-described instead of trusted. */
export const FACT_SHEET_SCHEMA_VERSION = 1;

/** Study-score weights, printed verbatim in the playbook footnote. Longevity
 * leads because it is the admission thesis; engagement breaks ties; label
 * confidence keeps shaky classifications out of the exemplar strips. */
export const STUDY_SCORE_WEIGHTS = {
  longevity: 0.5,
  engagement: 0.3,
  formatConfidence: 0.2,
} as const;
