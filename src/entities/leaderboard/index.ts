/**
 * Leaderboard entity — public read-only view of periods + entries.
 *
 * Server-only mutations:
 *   - `settle_leaderboard(period_id)` — ranks + pays via `_apply_reward()`.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCurrentLeaderboard } from "@/lib/leaderboard.functions";

export interface LeaderboardEntryDTO {
  userId: string;
  displayName: string | null;
  score: number;
  rank: number | null;
  rewardAmount: number;
}

export interface LeaderboardDTO {
  periodId: string | null;
  kind: string | null;
  startsAt: string | null;
  endsAt: string | null;
  settledAt: string | null;
  entries: LeaderboardEntryDTO[];
}

export const LEADERBOARD_QK = ["leaderboard", "current"] as const;

export const leaderboardQueryOptions = queryOptions({
  queryKey: LEADERBOARD_QK,
  queryFn: () => getCurrentLeaderboard(),
  staleTime: 30_000,
});

export function useCurrentLeaderboard() {
  return useQuery(leaderboardQueryOptions);
}
