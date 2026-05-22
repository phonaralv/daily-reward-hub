import { getTimeMultiplier } from "../waveEngine";
import type { UpdateIntensity } from "../types";
import type { PresenceSource } from "./types";

export interface LiveCounterSourceOpts {
  minDelta?: number;
  maxDelta?: number;
  intervalMs?: [number, number];
  waveMs?: [number, number];
  waveDelta?: [number, number];
  category?: "onboarding" | "trade" | "reward" | "activity";
  intensity?: UpdateIntensity;
  allowDecrease?: boolean;
  floor?: number;
  easeMs?: number;
}

const intensityScale = (i: UpdateIntensity): number => {
  switch (i) {
    case "low": return 0.5;
    case "normal": return 1;
    case "launch": return 1.5;
    case "viral": return 2.2;
  }
};

const rand = (a: number, b: number): number => a + Math.random() * (b - a);

const isLowEnd = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  return mem <= 2 || cores <= 4;
};

// Module-scope stride so concurrent counter instances stay staggered.
let globalOffset = 0;
const nextOffset = (): number => {
  globalOffset = (globalOffset + 137) % 800;
  return globalOffset;
};

/**
 * Counter source — encapsulates the wave/ease/quiet-window logic that
 * previously lived inside `useLiveCounter`. The driver only sees integer
 * values and reference identity.
 *
 * `minIntervalMs = 0` because ease frames must run every rAF tick for
 * smoothness; the actual delta-injection cadence is gated internally by
 * `nextTickAt` / `nextWaveAt` timestamps.
 */
export function liveCounterSource(
  seed: number,
  opts: LiveCounterSourceOpts = {},
  reducedMotion: boolean = false,
): PresenceSource<number> {
  const {
    minDelta = -2,
    maxDelta = 6,
    intervalMs = [2000, 8000],
    waveMs = [30_000, 90_000],
    waveDelta = [12, 48],
    category = "activity",
    intensity = "normal",
    allowDecrease = true,
    floor = 0,
    easeMs = 600,
  } = opts;

  const offset = nextOffset();
  const lowEnd = isLowEnd();
  const scale = intensityScale(intensity) * getTimeMultiplier(category);

  let mountedAt: number | null = null;
  let nextTickAt = 0;
  let nextWaveAt = 0;
  let target = seed;
  let from = seed;
  let current = seed;
  let easeStart: number | null = null;

  const planNextTick = (now: number): number =>
    now + rand(intervalMs[0], intervalMs[1]) * (lowEnd ? 2 : 1) + offset;
  const planNextWave = (now: number): number =>
    now + rand(waveMs[0], waveMs[1]);

  const applyDelta = (delta: number, now: number): void => {
    const next = Math.max(floor, target + delta);
    if (next === target) return;
    from = current;
    target = next;
    if (reducedMotion || easeMs <= 0) {
      easeStart = null;
      current = next;
      from = next;
    } else {
      easeStart = now;
    }
  };

  return {
    key: `live-counter:${category}`,
    minIntervalMs: 0,
    firstPaint: () => seed,
    sample: (now, prev) => {
      if (mountedAt === null) {
        // useSource has already enforced the quiet window. Fire the first
        // delta immediately, then schedule subsequent waves naturally.
        mountedAt = now;
        nextTickAt = now;
        nextWaveAt = planNextWave(now);
      }

      // Ease step
      if (easeStart !== null && !reducedMotion && easeMs > 0) {
        const p = Math.min(1, (now - easeStart) / easeMs);
        const eased = 1 - Math.pow(1 - p, 3);
        current = from + (target - from) * eased;
        if (p >= 1) {
          from = target;
          current = target;
          easeStart = null;
        }
      }

      if (now >= nextTickAt) {
        const dMin = allowDecrease ? minDelta : Math.max(0, minDelta);
        const delta = Math.round(rand(dMin, maxDelta) * scale);
        applyDelta(delta, now);
        nextTickAt = planNextTick(now);
      }

      if (now >= nextWaveAt) {
        const sign = allowDecrease && Math.random() < 0.18 ? -1 : 1;
        const big = Math.round(rand(waveDelta[0], waveDelta[1]) * scale) * sign;
        applyDelta(big, now);
        nextWaveAt = planNextWave(now);
      }

      return current === prev ? prev : current;
    },
  };
}
