/**
 * Leaderboard server functions — read current period + entries.
 *
 * Settlement happens via the `settle_leaderboard(period_id)` RPC, called
 * from `/api/public/cron/settle-leaderboard`. Client never settles.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LeaderboardDTO } from "@/entities/leaderboard";

export const getCurrentLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeaderboardDTO> => {
    const { supabase } = context;
    const now = new Date().toISOString();
    const { data: period, error: pErr } = await supabase
      .from("leaderboard_periods")
      .select("id, kind, starts_at, ends_at, settled_at")
      .lte("starts_at", now)
      .gte("ends_at", now)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!period) {
      return {
        periodId: null,
        kind: null,
        startsAt: null,
        endsAt: null,
        settledAt: null,
        entries: [],
      };
    }

    const { data: entries, error: eErr } = await supabase
      .from("leaderboard_entries")
      .select("user_id, score, rank, reward_amount")
      .eq("period_id", period.id)
      .order("score", { ascending: false })
      .limit(50);
    if (eErr) throw new Error(eErr.message);

    const userIds = (entries ?? []).map((e) => e.user_id);
    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds)
      : { data: [] as Array<{ id: string; display_name: string | null }> };
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name] as const),
    );

    return {
      periodId: period.id,
      kind: period.kind,
      startsAt: period.starts_at,
      endsAt: period.ends_at,
      settledAt: period.settled_at,
      entries: (entries ?? []).map((e, i) => ({
        userId: e.user_id,
        displayName: nameById.get(e.user_id) ?? null,
        score: Number(e.score ?? 0),
        rank: e.rank ?? i + 1,
        rewardAmount: Number(e.reward_amount ?? 0),
      })),
    };
  });
