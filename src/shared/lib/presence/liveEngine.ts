import { useEffect, useRef, useState } from "react";
import { useReducedMotionSafe } from "@/shared/lib/useReducedMotionSafe";
import { getTimeMultiplier, PRESENCE_QUIET_WINDOW_MS } from "./waveEngine";
import { subscribeTick } from "./runtime/scheduler";
import type { UpdateIntensity } from "./types";

interface LiveCounterOpts {
  /** Min delta per small tick (can be negative for fluctuation). */
  minDelta?: number;
  /** Max delta per small tick. */
  maxDelta?: number;
  /** Small tick interval [min, max] ms. */
  intervalMs?: [number, number];
  /** Wave tick interval [min, max] ms — larger movement. */
  waveMs?: [number, number];
  /** Wave delta magnitude. */
  waveDelta?: [number, number];
  /** Category for time-multiplier scaling. */
  category?: "onboarding" | "trade" | "reward" | "activity";
  /** Intensity override (kill-switch driven later). */
  intensity?: UpdateIntensity;
  /** Allow value to decrease occasionally (default true). */
  allowDecrease?: boolean;
  /** Lower bound (counter never drops below this). */
  floor?: number;
  /** Easing duration ms. 0 = instant snap. */
  easeMs?: number;
}

// Global offset stride to keep counter ticks staggered across instances.
let globalOffset = 0;
const nextOffset = (): number => {
  globalOffset = (globalOffset + 137) % 800; // prime stride
  return globalOffset;
};

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

/**
 * Subtle live counter — natural, non-monotonic.
 *
 * Step 1 (PR-1): all timing is driven by the single rAF scheduler
 * (`subscribeTick`). Hidden-tab pausing, reduced-motion snapping, and
 * the deterministic quiet window from waveEngine are preserved.
 * External signature unchanged from Step 0.
 */
export function useLiveCounter(seed: number, opts: LiveCounterOpts = {}) {
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

  const reduced = useReducedMotionSafe();
  const [display, setDisplay] = useState(seed);
  const targetRef = useRef(seed);
  const fromRef = useRef(seed);
  const easeStartRef = useRef<number | null>(null);
  const offsetRef = useRef(nextOffset());

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mountedAt = performance.now();
    const lowEnd = isLowEnd();
    const scale = intensityScale(intensity) * getTimeMultiplier(category);

    // Schedule first tick + first wave times.
    const planNextTick = (now: number): number => {
      const [lo, hi] = intervalMs;
      return now + rand(lo, hi) * (lowEnd ? 2 : 1) + offsetRef.current;
    };
    const planNextWave = (now: number): number => {
      const [lo, hi] = waveMs;
      return now + rand(lo, hi);
    };

    // Enforce the deterministic quiet window before either machine fires.
    const earliest = mountedAt + PRESENCE_QUIET_WINDOW_MS;
    let nextTickAt = Math.max(earliest, planNextTick(mountedAt));
    let nextWaveAt = Math.max(earliest, planNextWave(mountedAt));

    const applyDelta = (delta: number, now: number) => {
      const next = Math.max(floor, targetRef.current + delta);
      if (next === targetRef.current) return;
      // Snap fromRef to whatever the displayed value currently is so the
      // ease segment starts from the user-visible position.
      fromRef.current = display;
      targetRef.current = next;
      if (reduced || easeMs <= 0) {
        easeStartRef.current = null;
        setDisplay(next);
        fromRef.current = next;
      } else {
        easeStartRef.current = now;
      }
    };

    const tick = (now: number) => {
      // Ease step (also runs while no source-tick fires so animations are smooth)
      if (easeStartRef.current !== null && !reduced && easeMs > 0) {
        const p = Math.min(1, (now - easeStartRef.current) / easeMs);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = fromRef.current + (targetRef.current - fromRef.current) * eased;
        setDisplay(v);
        if (p >= 1) {
          fromRef.current = targetRef.current;
          easeStartRef.current = null;
        }
      }

      if (now >= nextTickAt) {
        const dMin = allowDecrease ? minDelta : Math.max(0, minDelta);
        const delta = Math.round(rand(dMin, maxDelta) * scale);
        applyDelta(delta, now);
        nextTickAt = planNextTick(now);
      }

      if (now >= nextWaveAt) {
        const [wMin, wMax] = waveDelta;
        const sign = allowDecrease && Math.random() < 0.18 ? -1 : 1;
        const big = Math.round(rand(wMin, wMax) * scale) * sign;
        applyDelta(big, now);
        nextWaveAt = planNextWave(now);
      }
    };

    return subscribeTick(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return display;
}
