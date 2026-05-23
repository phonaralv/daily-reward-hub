/**
 * leaderboardRankSource — adapts react-query LEADERBOARD_QK cache into a
 * PresenceSource so LiveValue / LiveBadge components can render
 * leaderboard rank without subscribing to react-query directly.
 *
 * PURITY: This module is React-free (Guard #9). It only reads from the
 * shared QueryClient and exposes a subscribe/get API.
 *
 * Updates flow:
 *   settle_leaderboard() RPC → leaderboard_entries updated
 *                          → useCurrentLeaderboard invalidates LEADERBOARD_QK
 *                          → react-query refetch sets new value
 *                          → this source emits to subscribers
 */
import type { QueryClient } from "@tanstack/react-query";
import { LEADERBOARD_QK } from "@/entities/leaderboard";

export interface LeaderboardRankSnapshot {
  periodId: string | null;
  kind: string | null;
  rank: number | null;
  score: number;
  rewardAmount: number;
  settled: boolean;
  updatedAt: number;
}

interface LeaderboardCacheRow {
  periodId?: string | null;
  kind?: string | null;
  entries?: Array<{
    userId: string;
    score: number;
    rank: number | null;
    rewardAmount: number;
  }>;
  settledAt?: string | null;
}

type Listener = (snap: LeaderboardRankSnapshot) => void;

export interface LeaderboardRankSource {
  key: "leaderboard-rank";
  get(): LeaderboardRankSnapshot;
  subscribe(listener: Listener): () => void;
}

let _shared: LeaderboardRankSource | null = null;

function readSnapshot(qc: QueryClient): LeaderboardRankSnapshot {
  const data = qc.getQueryData<LeaderboardCacheRow>(
    LEADERBOARD_QK as unknown as readonly unknown[]
  );

  // Find current user's entry if exists
  const myEntry = data?.entries?.find(() => {
    // Note: In real usage we would filter by current userId.
    // For now we expose the top entry or first entry as representative.
    // Full user-specific rank should come from dedicated query in future.
    return true;
  });

  return {
    periodId: data?.periodId ?? null,
    kind: data?.kind ?? null,
    rank: myEntry?.rank ?? null,
    score: myEntry?.score ?? 0,
    rewardAmount: myEntry?.rewardAmount ?? 0,
    settled: !!data?.settledAt,
    updatedAt: Date.now(),
  };
}

export function leaderboardRankSource(qc: QueryClient): LeaderboardRankSource {
  if (_shared) return _shared;

  const listeners = new Set<Listener>();
  let last = readSnapshot(qc);

  const unsubscribeCache = qc.getQueryCache().subscribe((event) => {
    const key = event.query.queryKey;
    if (!Array.isArray(key) || key[0] !== "leaderboard" || key[1] !== "current") {
      return;
    }

    const next = readSnapshot(qc);
    if (
      next.periodId === last.periodId &&
      next.rank === last.rank &&
      next.score === last.score &&
      next.settled === last.settled
    ) {
      return;
    }

    last = next;
    listeners.forEach((l) => l(next));
  });

  _shared = {
    key: "leaderboard-rank",
    get: () => last,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unsubscribeCache();
          _shared = null;
        }
      };
    },
  };

  return _shared;
}

/** test-only */
export function __resetLeaderboardRankSource() {
  _shared = null;
}
