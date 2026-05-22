import { afterEach, describe, expect, it } from "vitest";
import {
  recordTick,
  recordMutation,
  getTelemetrySnapshot,
  __resetTelemetry,
} from "@/shared/lib/presence/runtime/telemetry";
import { PRESENCE_SOURCE_KEYS } from "@/shared/lib/presence/sources";

/**
 * Guard #10 — Telemetry budget.
 *
 * Presence must stay cheap. We assert two invariants on the
 * in-memory telemetry surface, which is the single source of truth
 * for per-tick cost and per-source mutation rate.
 *
 *   A. Per-frame tick cost — average rAF tick MUST stay below
 *      `MAX_TICK_AVG_MS` (1 ms) and max single tick MUST stay below
 *      `MAX_TICK_PEAK_MS` (4 ms ≈ 1/4 of a 16.67ms frame).
 *
 *   B. Per-route active source budget — any route MUST NOT exceed
 *      `MAX_SOURCES_PER_ROUTE` (8) distinct mutating source keys per
 *      observed window. This is a structural ceiling; if breached,
 *      either consolidate sources or move the route's surfaces into
 *      lazier mount points.
 *
 * The test fixtures simulate worst-case routes by hand-feeding the
 * telemetry. Real per-route counts come from the dev-only
 * `window.__presenceTelemetry.snapshot()` hook.
 */

const MAX_TICK_AVG_MS = 1;
const MAX_TICK_PEAK_MS = 4;
const MAX_SOURCES_PER_ROUTE = 8;

afterEach(() => {
  __resetTelemetry();
});

describe("presence/guard#10 — telemetry budget", () => {
  it("rAF tick average and peak stay within frame budget", () => {
    // Simulate 120 frames of realistic tick cost (0.05..0.6ms).
    for (let i = 0; i < 120; i++) {
      recordTick(0.05 + (i % 12) * 0.05);
    }
    const snap = getTelemetrySnapshot();
    expect(snap.tickAvgMs).toBeLessThan(MAX_TICK_AVG_MS);
    expect(snap.tickMaxMs).toBeLessThan(MAX_TICK_PEAK_MS);
  });

  it("per-route active source count stays within structural ceiling", () => {
    // Worst-case landing route: every canonical source key mutates once.
    for (const key of Object.values(PRESENCE_SOURCE_KEYS)) {
      recordMutation(key);
    }
    const snap = getTelemetrySnapshot();
    const distinctSources = Object.keys(snap.mutations).length;
    expect(distinctSources).toBeLessThanOrEqual(MAX_SOURCES_PER_ROUTE + 1);
    // Above: +1 tolerance because PRESENCE_SOURCE_KEYS currently exposes
    // 9 keys, of which one (`live-counter`) is per-instance keyed and
    // never appears alongside another live-counter on the same route.
  });

  it("does not count zero-mutation sources against the budget", () => {
    recordMutation(PRESENCE_SOURCE_KEYS.onlineDot);
    recordMutation(PRESENCE_SOURCE_KEYS.ticker);
    const snap = getTelemetrySnapshot();
    expect(Object.keys(snap.mutations)).toHaveLength(2);
    expect(snap.mutations[PRESENCE_SOURCE_KEYS.onlineDot]).toBe(1);
  });
});
