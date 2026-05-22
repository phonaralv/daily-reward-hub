import { useEffect, useState } from "react";
import type { GlobalPulseState } from "./types";
import { getTimeMultiplier } from "./waveEngine";

/** Global pulse — derived from time-of-day multipliers + smooth rotation. */
export function useGlobalPulse(): GlobalPulseState {
  const [state, setState] = useState<GlobalPulseState>("steady");

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
    setState(compute());
    const id = setInterval(() => setState(compute()), 60_000);
    return () => clearInterval(id);
  }, []);

  return state;
}
