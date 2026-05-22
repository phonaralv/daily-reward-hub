/**
 * Presence Telemetry — minimal in-memory instruments.
 *
 * Step 2 (PR-1): just enough signal to (a) prove the single rAF loop
 * stays cheap and (b) count how often each source actually mutates a
 * presence value. Zero console output, zero network. Step 3 will layer
 * a real PerformanceObserver longtask channel + budget guards on top.
 *
 * Cost: tick path = single Float32Array write + integer increment.
 * Mutation path = single Map.get/set. No allocations.
 */

const TICK_RING_SIZE = 256;
const tickRing = new Float32Array(TICK_RING_SIZE);
let tickRingIdx = 0;
let tickCountTotal = 0;
let tickMaxMs = 0;
const mutationsByKey = new Map<string, number>();

export function recordTick(durationMs: number): void {
  tickRing[tickRingIdx] = durationMs;
  tickRingIdx = (tickRingIdx + 1) % TICK_RING_SIZE;
  tickCountTotal++;
  if (durationMs > tickMaxMs) tickMaxMs = durationMs;
}

export function recordMutation(key: string): void {
  mutationsByKey.set(key, (mutationsByKey.get(key) ?? 0) + 1);
}

export interface TelemetrySnapshot {
  tickCount: number;
  tickAvgMs: number;
  tickMaxMs: number;
  mutations: Record<string, number>;
}

export function getTelemetrySnapshot(): TelemetrySnapshot {
  const sampled = Math.min(tickCountTotal, TICK_RING_SIZE);
  let sum = 0;
  for (let i = 0; i < sampled; i++) sum += tickRing[i];
  const mutations: Record<string, number> = {};
  for (const [k, v] of mutationsByKey) mutations[k] = v;
  return {
    tickCount: tickCountTotal,
    tickAvgMs: sampled === 0 ? 0 : sum / sampled,
    tickMaxMs,
    mutations,
  };
}

/** Test-only: reset all counters and ring buffer to zero. */
export function __resetTelemetry(): void {
  tickRing.fill(0);
  tickRingIdx = 0;
  tickCountTotal = 0;
  tickMaxMs = 0;
  mutationsByKey.clear();
}
