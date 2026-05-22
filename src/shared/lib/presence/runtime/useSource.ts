import { useEffect, useMemo, useState } from "react";
import {
  PRESENCE_FIRST_LIVE_DELAY_MS,
  PRESENCE_QUIET_WINDOW_MS,
  presenceLockstepJitter,
} from "../waveEngine";
import type { PresenceSource } from "../sources/types";
import { subscribeTick } from "./scheduler";
import { recordMutation } from "./telemetry";

export interface UseSourceOptions {
  /** Floor delay before live takeover. Defaults to PRESENCE_FIRST_LIVE_DELAY_MS. */
  firstLiveDelayMs?: number;
  /** Distinct slot key for the No-Lockstep guarantee. */
  jitterKey?: string;
  /** If true, the source is allowed to fire before the global quiet window. */
  bypassQuietWindow?: boolean;
}

/**
 * Single driver for every PresenceSource.
 *
 * Responsibilities:
 *  - Subscribe to the shared rAF scheduler exactly once per mount.
 *  - Enforce the First Impression Invariant via the quiet window + jitter.
 *  - Enforce each source's `minIntervalMs` gate.
 *  - Skip React state updates when `sample` returns prev by reference.
 *  - Emit a telemetry mutation event on every real value change.
 */
export function useSource<T>(
  source: PresenceSource<T>,
  opts: UseSourceOptions = {},
): T {
  const firstPaint = useMemo(() => source.firstPaint(), [source.key]);
  const [value, setValue] = useState<T>(firstPaint);

  const firstLiveDelayMs = Math.max(
    PRESENCE_FIRST_LIVE_DELAY_MS,
    opts.firstLiveDelayMs ?? PRESENCE_FIRST_LIVE_DELAY_MS,
  );
  const jitter = opts.jitterKey ? presenceLockstepJitter(opts.jitterKey) : 0;
  const bypassQuiet = opts.bypassQuietWindow === true;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mountedAt = performance.now();
    const quietFloor = bypassQuiet ? 0 : PRESENCE_QUIET_WINDOW_MS;
    const liveAt = mountedAt + Math.max(firstLiveDelayMs, quietFloor) + jitter;
    let nextSampleAt = liveAt;
    let current: T = value;

    const tick = (now: number) => {
      if (now < nextSampleAt) return;
      const next = source.sample(now, current);
      if (next !== current) {
        current = next;
        recordMutation(source.key);
        setValue(next);
      }
      nextSampleAt = now + source.minIntervalMs;
    };

    return subscribeTick(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.key, firstLiveDelayMs, jitter, bypassQuiet]);

  return value;
}
