import { useMemo } from "react";
import type { GlobalPulseState } from "./types";
import { getTimeMultiplier } from "./waveEngine";
import { useSource } from "./runtime/useSource";
import type { PresenceSource } from "./sources/types";

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

const globalPulseSource: PresenceSource<GlobalPulseState> = {
  key: "global-pulse",
  minIntervalMs: PULSE_REFRESH_MS,
  firstPaint: () => GLOBAL_PULSE_FIRST_PAINT,
  sample: (_now, prev) => {
    const next = computePulse();
    return next === prev ? prev : next;
  },
};

/**
 * Global pulse hook — Step 2: delegates to a single inline PresenceSource.
 */
export function useGlobalPulse(): GlobalPulseState {
  const source = useMemo(() => globalPulseSource, []);
  return useSource(source, { jitterKey: "global-pulse" });
}
