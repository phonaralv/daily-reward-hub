import { useEffect, useState } from "react";
import type { GlobalPulseState } from "./types";
import {
  getTimeMultiplier,
  PRESENCE_FIRST_LIVE_DELAY_MS,
  presenceLockstepJitter,
} from "./waveEngine";
import { subscribeTick } from "./runtime/scheduler";

/**
 * Deterministic first-paint value for the global pulse.
 * SSR and the first 1000ms of CSR both render this.
 */
export const GLOBAL_PULSE_FIRST_PAINT: GlobalPulseState = "steady";

const PULSE_REFRESH_MS = 60_000;

function computePulse(): GlobalPulseState {
  const onboarding = getTimeMultiplier("onboarding");
  const trade = getTimeMultiplier("trade");
  const peak = Math.max(onboarding, trade);
  if (peak >= 1.4) return "global_surge";
  if (peak >= 1.3) return "hot_now";
  if (peak >= 1.15) return "trending";
  if (peak >= 0.9) return "steady";
  return "low";
}

/**
 * Global pulse hook.
 *
 * Step 1 (PR-1): driven by the single rAF scheduler. The Step 0
 * hydration contract is preserved — first render returns the
 * deterministic snapshot, live transition only starts after
 * `PRESENCE_FIRST_LIVE_DELAY_MS + jitter`.
 */
export function useGlobalPulse(): GlobalPulseState {
  const [state, setState] = useState<GlobalPulseState>(GLOBAL_PULSE_FIRST_PAINT);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mountedAt = performance.now();
    const jitter = presenceLockstepJitter("global-pulse");
    const firstLiveAt = mountedAt + PRESENCE_FIRST_LIVE_DELAY_MS + jitter;
    let nextRefreshAt = firstLiveAt;
    let started = false;

    const tick = (now: number) => {
      if (now < firstLiveAt) return;
      if (now >= nextRefreshAt) {
        setState(computePulse());
        started = true;
        nextRefreshAt = now + PULSE_REFRESH_MS;
      } else if (!started) {
        // edge: should not happen but keeps the contract explicit.
        started = true;
      }
    };

    return subscribeTick(tick);
  }, []);

  return state;
}
