import { COUNTRY_COUNT } from "@/shared/config/presence/regions";
import { stablePresenceHash, PRESENCE_FIRST_PAINT_SEED } from "../waveEngine";
import type { PresenceSource } from "./types";

const REFRESH_MS = 30_000;

/**
 * Aggregate active-country counter. Drifts in a deterministic ±3 envelope
 * around the canonical COUNTRY_COUNT constant. Pure: same `now` floor +
 * seed → same value on SSR and CSR.
 */
export function countryCountSource(
  seed: string = PRESENCE_FIRST_PAINT_SEED,
): PresenceSource<number> {
  const bucket = (now: number): number => Math.floor(now / REFRESH_MS);

  const valueAt = (b: number): number => {
    const h = stablePresenceHash(`${seed}:country:${b}`);
    const drift = (h % 7) - 3; // -3..+3
    return Math.max(1, COUNTRY_COUNT + drift);
  };

  return {
    key: "country:count",
    minIntervalMs: REFRESH_MS,
    firstPaint: () => COUNTRY_COUNT,
    sample: (now, prev) => {
      const next = valueAt(bucket(now));
      return next === prev ? prev : next;
    },
  };
}
