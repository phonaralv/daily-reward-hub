/**
 * Quest entity — catalog + user progress.
 *
 * Server is the only source of truth for `target`, `rewardAmount`,
 * `completedAt`, and `claimedAt`. Client merely renders.
 *
 * Mutation paths (single entry point):
 *   - `progress_quest(code, delta)` RPC  — accumulate progress (atomic)
 *   - `claim_quest(code)` RPC            — INSERTs into ledger_entries
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { listMyQuests } from "@/lib/quest.functions";

export interface QuestDTO {
  code: string;
  title: string;
  description: string | null;
  target: number;
  rewardAmount: number;
  sortOrder: number;
  /** null when user has no row yet */
  progress: number;
  completedAt: string | null;
  claimedAt: string | null;
}

export const QUEST_QK = ["quests", "me"] as const;

export const myQuestsQueryOptions = queryOptions({
  queryKey: QUEST_QK,
  queryFn: () => listMyQuests(),
  staleTime: 10_000,
});

export function useMyQuests() {
  return useQuery(myQuestsQueryOptions);
}
