// Pure QA over the described pool: where is the model reliable and where is
// it noisy? The results go straight into the playbook's honesty appendix.

import type { FactSheet } from "./factSheet";
import type { AdFacts } from "./tally";

export interface QaReport {
  /** Model's own cut estimates vs ffmpeg scene detection, pool-wide. */
  cutEstimate: { meanAbsoluteError: number; shareWithin2: number };
  /** Ads the model itself labeled with low format confidence. */
  lowConfidenceFormatAdIds: string[];
  /** Spoken hook quotes checked against provider ASR transcripts. On-screen
   * text hooks are not checkable this way — ASR only hears audio. */
  hookQuotes: {
    corroborated: number;
    contradicted: number;
    notCheckable: number;
    contradictedAdIds: string[];
  };
}

export function buildQaReport(pool: AdFacts[]): QaReport {
  const errors = pool.map((facts) =>
    Math.abs(facts.factSheet.estimatedCutsFirst10s - facts.measuredCutsFirst10s),
  );
  const meanAbsoluteError =
    errors.length === 0 ? 0 : errors.reduce((sum, e) => sum + e, 0) / errors.length;
  const shareWithin2 =
    errors.length === 0 ? 1 : errors.filter((e) => e <= 2).length / errors.length;

  const hookQuotes = { corroborated: 0, contradicted: 0, notCheckable: 0 };
  const contradictedAdIds: string[] = [];
  for (const facts of pool) {
    const verdict = corroborateQuote(facts.factSheet, facts.ad.providerTranscript);
    hookQuotes[verdict] += 1;
    if (verdict === "contradicted") contradictedAdIds.push(facts.ad.id);
  }

  return {
    cutEstimate: { meanAbsoluteError, shareWithin2 },
    lowConfidenceFormatAdIds: pool
      .filter((facts) => facts.factSheet.formatConfidence === "low")
      .map((facts) => facts.ad.id),
    hookQuotes: { ...hookQuotes, contradictedAdIds },
  };
}

/** Loose word-overlap check: transcripts are ASR (typos, no punctuation), so
 * exact substring matching would flag true quotes. Most hook words appearing
 * in the transcript counts as corroboration. Only spoken hooks are checked —
 * an on-screen text hook is invisible to ASR, so its absence proves nothing. */
function corroborateQuote(
  factSheet: FactSheet,
  transcript: string | null,
): "corroborated" | "contradicted" | "notCheckable" {
  if (factSheet.hookQuoteSource !== "spoken") return "notCheckable";
  if (!transcript || !factSheet.spokenHookQuote.trim()) return "notCheckable";
  const transcriptWords = new Set(normalizeWords(transcript));
  const quoteWords = normalizeWords(factSheet.spokenHookQuote);
  if (quoteWords.length === 0) return "notCheckable";
  const found = quoteWords.filter((word) => transcriptWords.has(word)).length;
  return found / quoteWords.length >= 0.7 ? "corroborated" : "contradicted";
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 0);
}
