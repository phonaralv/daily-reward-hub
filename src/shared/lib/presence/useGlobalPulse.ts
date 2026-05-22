import { useEffect, useState } from "react";
import type { GlobalPulseState } from "./types";
import {
  getTimeMultiplier,
  PRESENCE_FIRST_LIVE_DELAY_MS,
  presenceLockstepJitter,
} from "./waveEngine";

/**
 * Deterministic first-paint value for the global pulse.
 * SSR and the first 1000ms of CSR both render this.
 */
export const GLOBAL_PULSE_FIRST_PAINT: GlobalPulseState = "steady";

/**
 * Global pulse hook.
 *
 * Hydration contract (ALIVENESS spec §First Impression Invariant):
 * - First render returns GLOBAL_PULSE_FIRST_PAINT on both server and client.
 * - Live time-based computation only starts after firstLiveDelayMs +
 *   per-instance jitter, so it never violates the lockstep invariant
 *   together with sibling presence hooks.
 */
export function useGlobalPulse(): GlobalPulseState {
  const [state, setState] = useState<GlobalPulseState>(GLOBAL_PULSE_FIRST_PAINT);

  useEffect(() => {
    const compute = (): GlobalPulseState => {
      const onboarding = getTimeMultiplier("onboarding");
      const trade = getTimeMultiplier("trade");
      const peak = Math.max(onboarding, trade);
      if (peak >= 1.4) return "global_surge";
      if (peak >= 1.3) return "hot_now";
      if (peak >= 1.15) return "trending";
      if (peak >= 0.9) return "steady";
      return "low";
    };
    // Per-kind slot-based jitter keeps us out of the same 400ms bucket
    // as ticker / region-heat / onboarding-counter.
    const jitter = presenceLockstepJitter("global-pulse");
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const delayId = setTimeout(() => {
      setState(compute());
      intervalId = setInterval(() => setState(compute()), 60_000);
    }, PRESENCE_FIRST_LIVE_DELAY_MS + jitter);
    return () => {
      clearTimeout(delayId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return state;
}
