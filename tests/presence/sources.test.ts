import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { heatRegionSource } from "@/shared/lib/presence/sources/heatRegionSource";
import { liveCounterSource } from "@/shared/lib/presence/sources/liveCounterSource";
import { tickerSource } from "@/shared/lib/presence/sources/tickerSource";
import { countryCountSource } from "@/shared/lib/presence/sources/countryCountSource";
import { rewardWaveSource } from "@/shared/lib/presence/sources/rewardWaveSource";
import { trendingMissionSource } from "@/shared/lib/presence/sources/trendingMissionSource";
import { onlineDotSource } from "@/shared/lib/presence/sources/onlineDotSource";
import { worldActivityHeatSource } from "@/shared/lib/presence/sources/worldActivityHeatSource";
import {
  PRESENCE_SOURCE_KEYS,
  type PresenceSourceKey,
} from "@/shared/lib/presence/sources";
import type { PresenceSource } from "@/shared/lib/presence/sources/types";
import { useSource } from "@/shared/lib/presence/runtime/useSource";
import {
  recordMutation,
  recordTick,
  getTelemetrySnapshot,
  __resetTelemetry,
} from "@/shared/lib/presence/runtime/telemetry";
import { __resetPresenceScheduler } from "@/shared/lib/presence/runtime/scheduler";

afterEach(() => {
  __resetPresenceScheduler();
  __resetTelemetry();
  vi.restoreAllMocks();
});

describe("presence/sources", () => {
  it("heatRegionSource.firstPaint is deterministic across 100 calls", () => {
    const src = heatRegionSource(4);
    const first = src.firstPaint().map((r) => r.id);
    for (let i = 0; i < 99; i++) {
      const next = src.firstPaint().map((r) => r.id);
      expect(next).toEqual(first);
    }
  });

  it("liveCounterSource.firstPaint returns the seed deterministically", () => {
    const src = liveCounterSource(123, { easeMs: 0 });
    for (let i = 0; i < 100; i++) {
      expect(src.firstPaint()).toBe(123);
    }
  });

  it("useSource only calls source.sample once the firstLiveDelay gate passes", () => {
    const sample = vi.fn((_now: number, prev: number) => prev);
    const fake: PresenceSource<number> = {
      key: "test:gate",
      minIntervalMs: 10_000,
      firstPaint: () => 0,
      sample,
    };
    // Mount and immediately unmount. jsdom's rAF polyfill cannot deliver
    // a `now` that exceeds the 1200ms first-live floor in this window,
    // so sample must not have been called.
    const { unmount } = renderHook(() => useSource(fake));
    expect(sample).not.toHaveBeenCalled();
    unmount();
  });

  it("useSource returns the firstPaint reference on the initial render", () => {
    const stable = { value: 42 };
    const sample = vi.fn(() => stable);
    const fake: PresenceSource<{ value: number }> = {
      key: "test:ref",
      minIntervalMs: 0,
      firstPaint: () => stable,
      sample,
    };
    const renders: Array<{ value: number }> = [];
    renderHook(() => {
      const v = useSource(fake);
      renders.push(v);
      return v;
    });
    expect(renders.length).toBeGreaterThanOrEqual(1);
    expect(renders[0]).toBe(stable);
  });

  it("telemetry: recordTick wraps the 256-slot ring and tracks max/count", () => {
    for (let i = 0; i < 300; i++) recordTick((i % 10) + 1);
    recordMutation("x");
    recordMutation("x");
    recordMutation("y");
    const snap = getTelemetrySnapshot();
    expect(snap.tickCount).toBe(300);
    // After 300 writes into a 256-slot ring, max remains the largest value seen.
    expect(snap.tickMaxMs).toBe(10);
    // Average is computed across the sampled window (256 slots).
    expect(snap.tickAvgMs).toBeGreaterThan(0);
    expect(snap.tickAvgMs).toBeLessThanOrEqual(10);
    expect(snap.mutations).toEqual({ x: 2, y: 1 });
  });

  // ─────────────────────────────────────────────────────────────────────
  // PR-2 Step 1 — Source contract regression tests
  //
  // Contracts under test:
  //  (1) sample(now, prev) MUST return `prev` by reference identity when
  //      nothing has meaningfully changed. This is the single most load-
  //      bearing invariant in the Presence runtime: useSource depends on
  //      it to skip React state updates and to avoid recording spurious
  //      mutations in telemetry. A regression here causes silent perf
  //      damage with no test failure elsewhere.
  //  (2) firstPaint() is deterministic — same input, same output on every
  //      call. SSR and the first 1000ms of CSR rely on this.
  //  (3) minIntervalMs is the declared driver gate. The contract value
  //      must match the documented behaviour of each source.
  //  (4) Source-specific guarantees:
  //       - heatRegionSource: identical region.id sequence → same ref
  //       - liveCounterSource: during ease, `current` advances monotonically
  // ─────────────────────────────────────────────────────────────────────

  describe("contract (1) — sample returns prev by REFERENCE when unchanged", () => {
    it("heatRegionSource: 20 consecutive samples with stable heat ordering all return prev by reference", () => {
      const src = heatRegionSource(4);
      // Establish a stable "prev" by taking one real sample first. After
      // this, the regions are sorted by current heat; subsequent samples
      // within the same wall-clock window will produce the same id
      // sequence and MUST therefore return `prev` by reference.
      const seed = src.sample(0, src.firstPaint());
      for (let i = 0; i < 20; i++) {
        const next = src.sample(i, seed);
        // Object.is reference equality — NOT deep equality.
        expect(next).toBe(seed);
      }
    });

    it("liveCounterSource: 20 consecutive samples without a delta firing all return prev by reference", () => {
      // Push tick/wave intervals far into the future so no delta fires
      // during the test window. `current` stays at seed → sample returns
      // `prev` (identity for primitives).
      const src = liveCounterSource(100, {
        easeMs: 0,
        intervalMs: [1_000_000, 1_000_000],
        waveMs: [1_000_000, 1_000_000],
      });
      const seed = src.sample(0, 100);
      expect(seed).toBe(100);
      for (let i = 0; i < 20; i++) {
        const next = src.sample(i, 100);
        expect(next).toBe(100);
      }
    });
  });

  describe("contract (2) — firstPaint is deterministic", () => {
    it("heatRegionSource.firstPaint returns the same id sequence on repeated calls", () => {
      const src = heatRegionSource(4);
      const a = src.firstPaint().map((r) => r.id);
      const b = src.firstPaint().map((r) => r.id);
      expect(b).toEqual(a);
    });

    it("liveCounterSource.firstPaint returns the seed on repeated calls", () => {
      const src = liveCounterSource(777, { easeMs: 0 });
      expect(src.firstPaint()).toBe(777);
      expect(src.firstPaint()).toBe(777);
    });
  });

  describe("contract (3) — minIntervalMs declares the documented driver gate", () => {
    it("heatRegionSource declares the 45s refresh gate", () => {
      expect(heatRegionSource(4).minIntervalMs).toBe(45_000);
    });

    it("liveCounterSource declares minIntervalMs=0 (per-frame ease, internal cadence gates)", () => {
      expect(liveCounterSource(0).minIntervalMs).toBe(0);
    });
  });

  describe("contract (4) — source-specific guarantees", () => {
    it("heatRegionSource: identical region.id sequence yields the same reference", () => {
      const src = heatRegionSource(4);
      const a = src.sample(0, src.firstPaint());
      const b = src.sample(1, a);
      // When the heat-sorted ids match `prev`, the source returns `prev`
      // verbatim — by reference, not a fresh array of equal regions.
      expect(b).toBe(a);
    });

    it("liveCounterSource: during ease, `current` advances monotonically toward target", () => {
      // Deterministic random → predictable delta magnitude and sign.
      vi.spyOn(Math, "random").mockReturnValue(0.5);

      // Tight tick cadence (~1ms + offset) and ease over 600ms keeps the
      // counter continuously interpolating upward. Disable decreases and
      // push waves out of range so only positive deltas occur.
      const src = liveCounterSource(0, {
        easeMs: 600,
        intervalMs: [1, 1],
        waveMs: [1_000_000, 1_000_000],
        allowDecrease: false,
        minDelta: 4,
        maxDelta: 4,
      });

      // Start well past the quiet window so mount-time earliestDelta does
      // not push the first tick further than our sampling range.
      const base = 10_000;
      const values: number[] = [];
      let prev = 0;
      for (let t = base; t <= base + 3000; t += 50) {
        const v = src.sample(t, prev);
        values.push(v);
        prev = v;
      }

      // At least one delta must have fired.
      const firstChange = values.findIndex((v) => v > 0);
      expect(firstChange).toBeGreaterThan(-1);

      // From the first non-zero value onward, the counter must be
      // non-decreasing (ease is a 1 - (1-p)^3 curve toward a higher
      // target, with subsequent positive deltas only).
      for (let i = firstChange + 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
      }
    });
  });
});
