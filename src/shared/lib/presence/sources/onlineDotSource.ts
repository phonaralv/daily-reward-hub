import { stablePresenceHash, PRESENCE_FIRST_PAINT_SEED } from "../waveEngine";
import type { PresenceSource } from "./types";

export type OnlineDotState = "online" | "idle";

const REFRESH_MS = 2_500;

/**
 * Aggregate online-presence dot. Stays `online` ~92% of buckets; flips to
 * `idle` for a single bucket otherwise. Deterministic per (seed, bucket).
 */
export function onlineDotSource(
  seed: string = PRESENCE_FIRST_PAINT_SEED,
): PresenceSource<OnlineDotState> {
  const stateAt = (bucket: number): OnlineDotState => {
    const h = stablePresenceHash(`${seed}:dot:${bucket}`);
    return h % 100 < 8 ? "idle" : "online";
  };
  return {
    key: "online:dot",
    minIntervalMs: REFRESH_MS,
    firstPaint: () => "online",
    sample: (now, prev) => {
      const next = stateAt(Math.floor(now / REFRESH_MS));
      return next === prev ? prev : next;
    },
  };
}
