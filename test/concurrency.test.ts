// The concurrency pool must preserve order, run everything exactly once, and
// never exceed its in-flight limit.

import { describe, expect, test } from "bun:test";
import { mapWithConcurrency } from "../src/concurrency";

describe("mapWithConcurrency", () => {
  test("preserves input order in results", async () => {
    const items = [30, 10, 20];
    const results = await mapWithConcurrency(items, 2, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return ms * 2;
    });
    expect(results).toEqual([60, 20, 40]);
  });

  test("never exceeds the in-flight limit", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
      },
    );
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });

  test("runs every item exactly once", async () => {
    const seen: number[] = [];
    await mapWithConcurrency([1, 2, 3, 4, 5], 3, async (n) => {
      seen.push(n);
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
