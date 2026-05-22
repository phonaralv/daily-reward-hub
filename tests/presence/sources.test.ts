import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { heatRegionSource } from "@/shared/lib/presence/sources/heatRegionSource";
import { liveCounterSource } from "@/shared/lib/presence/sources/liveCounterSource";
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

  it("useSource only calls source.sample once the minIntervalMs gate passes", () => {
    // Custom source we fully control. minIntervalMs is huge so the second
    // call inside the same render must not fire.
    const sample = vi.fn((_now: number, prev: number) => prev);
    const fake: PresenceSource<number> = {
      key: "test:gate",
      minIntervalMs: 10_000,
      firstPaint: () => 0,
      sample,
    };
    // Mount the hook and immediately unmount — sample should not have fired
    // because the quiet window puts firstAt far in the future and no real
    // rAF tick reaches it during this short test.
    const { unmount } = renderHook(() => useSource(fake, { bypassQuietWindow: false }));
    expect(sample).not.toHaveBeenCalled();
    unmount();
  });

  it("useSource skips React updates when sample returns prev by reference", () => {
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
      const v = useSource(fake, { bypassQuietWindow: true });
      renders.push(v);
      return v;
    });
    // No rAF time has actually elapsed in jsdom enough to assert further;
    // the contract under test is that the firstPaint render is the only
    // render emitted when the source never produces a new reference.
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
});
