import { useEffect, useRef, useState } from "react";
import { useReducedMotionSafe } from "@/shared/lib/useReducedMotionSafe";
import { getTimeMultiplier } from "./waveEngine";
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

// Global scheduler offset to prevent simultaneous updates across components.
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
 * Subtle live counter — natural, non-monotonic. Pauses on hidden tab.
 * Respects reduced-motion (snap, no easing).
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
  const rafRef = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);
  const waveTimer = useRef<number | null>(null);
  const offset = useRef(nextOffset());

  // Animate display → target with easing
  useEffect(() => {
    if (reduced) {
      setDisplay(targetRef.current);
      fromRef.current = targetRef.current;
      return;
    }
    const animate = () => {
      const from = fromRef.current;
      const to = targetRef.current;
      const start = performance.now();
      const dur = easeMs;
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = from + (to - from) * eased;
        setDisplay(v);
        if (p < 1) rafRef.current = requestAnimationFrame(step);
        else fromRef.current = to;
      };
      rafRef.current = requestAnimationFrame(step);
    };
    animate();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [display === seed ? seed : null, reduced, easeMs]); // re-run only when target shifts (display tracking)

  // Schedule small ticks
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    const lowEnd = isLowEnd();
    const scale = intensityScale(intensity) * getTimeMultiplier(category);

    const scheduleTick = () => {
      if (cancelled) return;
      const [lo, hi] = intervalMs;
      const baseDelay = rand(lo, hi) * (lowEnd ? 2 : 1);
      const delay = baseDelay + offset.current;
      tickTimer.current = window.setTimeout(() => {
        if (document.hidden) {
          scheduleTick();
          return;
        }
        const dMin = allowDecrease ? minDelta : Math.max(0, minDelta);
        const delta = Math.round(rand(dMin, maxDelta) * scale);
        const next = Math.max(floor, targetRef.current + delta);
        targetRef.current = next;
        fromRef.current = display;
        setDisplay((v) => v); // trigger ease effect via dep above
        // kick animation
        if (reduced) {
          setDisplay(next);
          fromRef.current = next;
        } else {
          const from = fromRef.current;
          const start = performance.now();
          const step = (t: number) => {
            const p = Math.min(1, (t - start) / easeMs);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(from + (next - from) * eased);
            if (p < 1) rafRef.current = requestAnimationFrame(step);
            else fromRef.current = next;
          };
          if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(step);
        }
        scheduleTick();
      }, delay);
    };

    const scheduleWave = () => {
      if (cancelled) return;
      const [lo, hi] = waveMs;
      waveTimer.current = window.setTimeout(() => {
        if (!document.hidden) {
          const [wMin, wMax] = waveDelta;
          const sign = allowDecrease && Math.random() < 0.18 ? -1 : 1;
          const big = Math.round(rand(wMin, wMax) * scale) * sign;
          const next = Math.max(floor, targetRef.current + big);
          targetRef.current = next;
          // ride into ease via next small tick
        }
        scheduleWave();
      }, rand(lo, hi));
    };

    scheduleTick();
    scheduleWave();

    return () => {
      cancelled = true;
      if (tickTimer.current) clearTimeout(tickTimer.current);
      if (waveTimer.current) clearTimeout(waveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return display;
}
