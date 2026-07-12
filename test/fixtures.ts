// Builders for test data: a realistic Ad and FactSheet with every field set,
// overridable per test so each test states only what it cares about.

import type { Ad } from "../src/ad";
import type { FactSheet } from "../src/factSheet";
import type { Fingerprint } from "../src/media";

export function makeAd(overrides: Partial<Ad> = {}): Ad {
  return {
    id: "ad-1",
    brand: "Acme Coffee",
    platform: "tiktok",
    description: "The smoothest cold brew you will ever try",
    buttonText: "Shop now",
    coverUrl: "https://example.com/cover.jpg",
    videoUrl: "https://example.com/video.mp4",
    durationSeconds: 30,
    daysRunning: 45,
    firstSeenAt: 1_750_000_000,
    lastSeenAt: 1_755_000_000,
    playCount: 100_000,
    likeCount: 2_000,
    providerTranscript: null,
    ...overrides,
  };
}

export function makeFactSheet(overrides: Partial<FactSheet> = {}): FactSheet {
  return {
    whatItSells: "Cold brew coffee concentrate",
    marketFit: "core product",
    segment: "cold brew",
    formatLabel: "product demo",
    formatConfidence: "high",
    hookStyle: "bold claim",
    spokenHookQuote: "This is the smoothest cold brew ever",
    firstThreeSeconds: "A hand pours dark coffee over ice in a glass",
    productOnScreen: "first 3 seconds",
    creatorVsBrandFeel: "creator",
    demoClarity: "full demo",
    ctaStyle: "soft",
    pacing: "fast",
    estimatedCutsFirst10s: 4,
    emotionalTone: "energetic",
    worksWithSoundOff: true,
    audienceCue: "iced coffee drinkers",
    ...overrides,
  };
}

export function makeFingerprint(overrides: Partial<Fingerprint> = {}): Fingerprint {
  return {
    sha256: "a".repeat(64),
    perceptualHash: "ff00ff00ff00ff00",
    durationSeconds: 30,
    ...overrides,
  };
}
