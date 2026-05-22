import { stablePresenceHash, PRESENCE_FIRST_PAINT_SEED } from "../waveEngine";
import type { PresenceSource } from "./types";

export interface MissionPulse {
  readonly id: string;
  readonly score: number;
}

const MISSION_IDS = [
  "daily-trade-streak",
  "first-deposit-boost",
  "weekly-leaderboard",
  "refer-three-friends",
  "play-five-slots",
  "complete-onboarding",
  "claim-reward-wave",
  "join-live-room",
] as const;

const REFRESH_MS = 20_000;

/**
 * Trending mission rotation. Re-ranks a fixed mission pool by a bucketed
 * deterministic score. Returns `prev` by reference when the id sequence
 * is unchanged across consecutive buckets.
 */
export function trendingMissionSource(
  size: number = 3,
  seed: string = PRESENCE_FIRST_PAINT_SEED,
): PresenceSource<readonly MissionPulse[]> {
  const clamped = Math.max(1, Math.min(size, MISSION_IDS.length));

  const rank = (bucket: number): MissionPulse[] => {
    return MISSION_IDS.map((id) => {
      const h = stablePresenceHash(`${seed}:mission:${id}:${bucket}`);
      return { id, score: h / 0xffffffff };
    })
      .sort((a, b) => b.score - a.score)
      .slice(0, clamped);
  };

  return {
    key: "mission:trending",
    minIntervalMs: REFRESH_MS,
    firstPaint: () => rank(0),
    sample: (now, prev) => {
      const next = rank(Math.floor(now / REFRESH_MS));
      if (
        prev.length === next.length &&
        prev.every((m, i) => m.id === next[i].id)
      ) {
        return prev;
      }
      return next;
    },
  };
}
