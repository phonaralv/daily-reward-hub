/**
 * Streak entity — DTO + cache key + hook.
 *
 * Streak state is read-only from the client; the only mutator is
 * `claim_daily_reward()` RPC, which atomically advances the streak
 * AND credits the ledger in one transaction.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getStreak } from "@/lib/streak.functions";

export interface StreakDTO {
  userId: string;
  currentDay: number;        // 0..7 (0 = never claimed)
  lastClaimDate: string | null; // ISO date
  longest: number;
  updatedAt: string;
}

export const STREAK_QK = ["streak", "me"] as const;

export const streakQueryOptions = queryOptions({
  queryKey: STREAK_QK,
  queryFn: () => getStreak(),
  staleTime: 10_000,
});

export function useStreak() {
  return useQuery(streakQueryOptions);
}
