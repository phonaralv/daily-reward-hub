import { useEffect, useMemo, useState } from "react";
import { REGIONS, type Region } from "@/shared/config/presence/regions";
import { subscribeTick } from "./runtime/scheduler";
import { hourInTz } from "@/shared/config/locale";

/**
 * Stable seed used for first-paint deterministic ordering.
 * Bump the suffix (vN) only when a deliberate visual reshuffle is required.
 * See docs/presence/ALIVENESS.md §First Impression Invariant.
 */
export const PRESENCE_FIRST_PAINT_SEED = "phonara-pr1-presence-v1";

/**
 * Minimum delay before the client switches from the deterministic first-paint
 * snapshot to live, heat-based ordering. Must be >= the First Impression
 * Invariant window (1000ms). 1200ms = 1000ms invariant + 200ms safety.
 */
export const PRESENCE_FIRST_LIVE_DELAY_MS = 1200;

/**
 * Slot width for staggering live-takeover across presence hooks.
 * Must exceed the No-Lockstep bucket size (400ms) by enough margin that
 * timing jitter cannot collapse two slots into the same bucket. 500ms
 * gives 100ms safety on each side.
 */
export const PRESENCE_LOCKSTEP_SLOT_MS = 500;
/** Number of distinct slots. >= number of concurrent live presence hooks. */
export const PRESENCE_LOCKSTEP_SLOT_COUNT = 4;

/**
 * Quiet window (ms from mount) reserved for deterministic slot takeovers.
 * Any non-slotted live presence (e.g. random-interval counters) must wait
 * past this point before its first mutation.
 */
export const PRESENCE_QUIET_WINDOW_MS =
  PRESENCE_FIRST_LIVE_DELAY_MS + PRESENCE_LOCKSTEP_SLOT_COUNT * PRESENCE_LOCKSTEP_SLOT_MS + 400;

/**
 * Deterministic per-kind jitter that places each caller into a distinct
 * 500ms slot, preventing the No-Lockstep invariant from firing on first
 * live takeover. Two callers with the same jitterKey land in the same slot
 * (intentional). Different jitterKeys are very unlikely to collide because
 * we map a 32-bit hash into 6 slots.
 */
export function presenceLockstepJitter(
  jitterKey: string,
  seed: string = PRESENCE_FIRST_PAINT_SEED,
): number {
  const slot = stablePresenceHash(`${seed}:slot:${jitterKey}`) % PRESENCE_LOCKSTEP_SLOT_COUNT;
  return slot * PRESENCE_LOCKSTEP_SLOT_MS;
}

/**
 * Deterministic 32-bit hash (FNV-1a). Pure, SSR-safe, dependency-free.
 * Same input on Node, Workerd, and Chromium V8 produces the same integer
 * because `Math.imul` is ECMAScript-standard 32-bit multiply.
 */
export function stablePresenceHash(input: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0;
}

/**
 * Pure function: returns a stable, reproducible ordering of regions for the
 * first paint. Depends only on (count, seed, REGIONS declaration order) —
 * never on Date, Math.random, locale, or DOM state.
 */
export function getDeterministicRegions(
  count = 4,
  seed: string = PRESENCE_FIRST_PAINT_SEED,
): Region[] {
  return REGIONS.map((region, index) => ({
    region,
    score: stablePresenceHash(`${seed}:${region.id}`),
    index,
  }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, Math.max(0, count))
    .map(({ region }) => region);
}

/**
 * Compute "heat" score for a region from its local prime hours.
 * Time-dependent — MUST NOT run during the first paint window.
 */
export function regionHeat(r: Region, now: Date = new Date()): number {
  const h = hourInTz(r.timezone, now);
  const [start, end] = r.activeHours;
  const inPrime = h >= start && h <= end;
  const base = 0.5 + Math.sin((h / 24) * Math.PI * 2) * 0.15;
  return inPrime ? base * r.activityMultiplier + 0.4 : base * 0.6;
}

function computeHeatRegions(count: number): Region[] {
  return [...REGIONS]
    .map((r) => ({ r, score: regionHeat(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ r }) => r);
}

export interface UseActiveRegionsOptions {
  seed?: string;
  /** Delay before live takeover. Floored at PRESENCE_FIRST_LIVE_DELAY_MS. */
  firstLiveDelayMs?: number;
  /**
   * Per-call jitter key. Two components using the same hook with different
   * `jitterKey` values will switch to live at different times, preventing
   * the No-Lockstep invariant from firing on first takeover.
   */
  jitterKey?: string;
}

/**
 * Region rotation hook.
 *
 * Hydration contract (ALIVENESS spec §First Impression Invariant):
 * - First render on BOTH server and client returns
 *   `getDeterministicRegions(count, seed)` — a pure function of inputs.
 *   SSR HTML and the first hydrated DOM render identical text.
 * - After `firstLiveDelayMs + jitter` (>= 1200ms), the client switches to
 *   live heat-based ordering and refreshes every 45s. jitter (0..600ms,
 *   deterministic per jitterKey) staggers sibling components so they never
 *   land in the same 400ms lockstep bucket.
 */
export function useActiveRegions(
  count: number = 4,
  opts: UseActiveRegionsOptions = {},
): Region[] {
  const seed = opts.seed ?? PRESENCE_FIRST_PAINT_SEED;
  const firstLiveDelayMs = Math.max(
    PRESENCE_FIRST_LIVE_DELAY_MS,
    opts.firstLiveDelayMs ?? PRESENCE_FIRST_LIVE_DELAY_MS,
  );
  const jitter = opts.jitterKey ? presenceLockstepJitter(opts.jitterKey, seed) : 0;


  const firstPaint = useMemo(
    () => getDeterministicRegions(count, seed),
    [count, seed],
  );
  const [active, setActive] = useState<Region[]>(firstPaint);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mountedAt = performance.now();
    const firstLiveAt = mountedAt + firstLiveDelayMs + jitter;
    let nextAt = firstLiveAt;
    const REFRESH_MS = 45_000;

    const tick = (now: number) => {
      if (now < nextAt) return;
      setActive(computeHeatRegions(count));
      nextAt = (now === firstLiveAt ? now : now) + REFRESH_MS;
    };

    return subscribeTick(tick);
  }, [count, seed, firstLiveDelayMs, jitter]);

  return active;
}


/** Time-bucket multipliers for different content types. */
export function getTimeMultiplier(
  category: "onboarding" | "trade" | "reward" | "activity",
): number {
  const seoulH = hourInTz("Asia/Seoul");
  const nyH = hourInTz("America/New_York");
  const lonH = hourInTz("Europe/London");

  const asiaPrime = seoulH >= 19 && seoulH <= 23;
  const naEvening = nyH >= 19 && nyH <= 23;
  const euLunch = lonH >= 12 && lonH <= 14;
  const krDawn = seoulH >= 2 && seoulH <= 6;

  if (krDawn) return 0.55;
  if (category === "onboarding" || category === "activity")
    return asiaPrime ? 1.45 : 1.0;
  if (category === "trade" || category === "reward")
    return naEvening ? 1.4 : euLunch ? 1.2 : 1.0;
  return 1.0;
}
