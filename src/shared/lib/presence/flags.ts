/**
 * Presence kill-switch flags — single entry point.
 *
 * Step 1 (PR-1): values are build-time constants synchronised with
 * docs/presence/RULES.md §Kill switches. In PR-2 this file is the ONLY
 * place that changes when the flags become server-driven (Supabase
 * config row). All presence code MUST read flags via `getPresenceFlags()`
 * so the seam stays single-edit.
 */

import type { UpdateIntensity } from "./types";

export interface PresenceFlags {
  /** Global OFF switch. When false, presence hooks return their first-paint value forever. */
  engineEnabled: boolean;
  /** When false, counters and live ordering freeze at the deterministic snapshot. */
  dynamicUpdatesEnabled: boolean;
  /** Scales delta amplitude across all sources. */
  updateIntensity: UpdateIntensity;
  /** 0..100 — share of seed waves vs. real aggregate events. PR-2 wires this. */
  seedRatio: number;
  /** Launch-mode boost — temporarily amplifies presence amplitude. */
  launchMode: boolean;
}

const DEFAULT_FLAGS: PresenceFlags = {
  engineEnabled: true,
  dynamicUpdatesEnabled: true,
  updateIntensity: "normal",
  seedRatio: 100,
  launchMode: false,
};

/**
 * Read the active presence flag set.
 *
 * Pure for now (returns the module constant). PR-2 will replace the body
 * with a server-driven read; callers do not change.
 */
export function getPresenceFlags(): PresenceFlags {
  return DEFAULT_FLAGS;
}
