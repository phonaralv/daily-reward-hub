import type { Region } from "@/shared/config/presence/regions";
import { REGIONS } from "@/shared/config/presence/regions";
import {
  getDeterministicRegions,
  regionHeat,
  PRESENCE_FIRST_PAINT_SEED,
} from "../waveEngine";
import type { PresenceSource } from "./types";

const REFRESH_MS = 45_000;

/**
 * Heat-ordered region source.
 *
 * - `firstPaint`: deterministic ordering (SSR-identical).
 * - `sample`: re-sorts REGIONS by current heat. Returns prev BY REFERENCE
 *   when the id sequence is unchanged so the driver skips re-render and
 *   does not record a spurious mutation.
 */
export function heatRegionSource(
  count: number = 4,
  seed: string = PRESENCE_FIRST_PAINT_SEED,
): PresenceSource<Region[]> {
  return {
    key: "region-heat",
    minIntervalMs: REFRESH_MS,
    firstPaint: () => getDeterministicRegions(count, seed),
    sample: (_now, prev) => {
      const next = [...REGIONS]
        .map((r) => ({ r, score: regionHeat(r) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, count)
        .map(({ r }) => r);
      if (
        prev.length === next.length &&
        prev.every((r, i) => r.id === next[i].id)
      ) {
        return prev;
      }
      return next;
    },
  };
}
