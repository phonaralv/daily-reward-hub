import { REGIONS } from "@/shared/config/presence/regions";
import { stablePresenceHash, PRESENCE_FIRST_PAINT_SEED } from "../waveEngine";
import type { PresenceSource } from "./types";

export interface TickerItem {
  readonly id: string;
  readonly regionId: string;
  readonly kind: "join" | "reward" | "mission" | "trade";
  readonly weight: number;
}

const KINDS: TickerItem["kind"][] = ["join", "reward", "mission", "trade"];

/**
 * Build the deterministic ticker pool. Pure: identical seed/regions yields
 * an identical pool on SSR, Workerd, and CSR first paint.
 */
function buildPool(seed: string): TickerItem[] {
  const pool: TickerItem[] = [];
  for (const region of REGIONS) {
    for (const kind of KINDS) {
      const h = stablePresenceHash(`${seed}:${region.id}:${kind}`);
      pool.push({
        id: `${region.id}-${kind}`,
        regionId: region.id,
        kind,
        weight: (h % 1000) / 1000,
      });
    }
  }
  return pool;
}

const WINDOW_SIZE = 5;
const REFRESH_MS = 8_000;

/**
 * Global ticker source — rotates a deterministic 5-slot window over a stable
 * pool of aggregate items. Returns `prev` by reference when the id sequence
 * is unchanged (e.g. rotation step equals the previous step).
 */
export function tickerSource(
  size: number = WINDOW_SIZE,
  seed: string = PRESENCE_FIRST_PAINT_SEED,
): PresenceSource<readonly TickerItem[]> {
  const pool = buildPool(seed);
  const step = Math.max(1, Math.min(size, pool.length));

  const slice = (start: number): TickerItem[] => {
    const out: TickerItem[] = new Array(step);
    for (let i = 0; i < step; i++) out[i] = pool[(start + i) % pool.length];
    return out;
  };

  const cursorFor = (now: number): number =>
    (Math.floor(now / REFRESH_MS) * step) % pool.length;

  return {
    key: "ticker:global",
    minIntervalMs: REFRESH_MS,
    firstPaint: () => slice(0),
    sample: (now, prev) => {
      const next = slice(cursorFor(now));
      if (
        prev.length === next.length &&
        prev.every((it, i) => it.id === next[i].id)
      ) {
        return prev;
      }
      return next;
    },
  };
}
