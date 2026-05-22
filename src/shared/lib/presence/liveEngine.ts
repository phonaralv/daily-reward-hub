import { useMemo } from "react";
import { useReducedMotionSafe } from "@/shared/lib/useReducedMotionSafe";
import { useSource } from "./runtime/useSource";
import {
  liveCounterSource,
  type LiveCounterSourceOpts,
} from "./sources/liveCounterSource";

export type LiveCounterOpts = LiveCounterSourceOpts;

/**
 * Subtle live counter — natural, non-monotonic.
 *
 * Step 2 (PR-1): pure delegation to `liveCounterSource` via `useSource`.
 * All wave/ease/quiet-window logic lives in the source; this file is a
 * stable public hook surface only.
 */
export function useLiveCounter(seed: number, opts: LiveCounterOpts = {}): number {
  const reduced = useReducedMotionSafe();
  const source = useMemo(
    () => liveCounterSource(seed, opts, reduced),
    // Hook contract: re-create source if seed or motion preference changes.
    // Options object identity is treated as stable by callers (matches Step 1 behaviour).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, reduced],
  );
  return useSource(source);
}
