/**
 * Leaderboard server functions — read current period + entries.
 *
 * SECURITY: The `leaderboard_entries` table only exposes the caller's own
 * row via RLS. The public listing comes from the SECURITY DEFINER RPC
 * `get_leaderboard_entries(period_id)` which returns display_name + rank +
 * score + reward + is_self, but NEVER `user_id`. This prevents enumerating
 * participants' UUIDs to cross-join with `profiles`.
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

    const { data: rows, error: eErr } = await supabase.rpc(
      "get_leaderboard_entries",
      { p_period_id: period.id },
    );
    if (eErr) throw new Error(eErr.message);

    return {
      periodId: period.id,
      kind: period.kind,
      startsAt: period.starts_at,
      endsAt: period.ends_at,
      settledAt: period.settled_at,
      entries: (rows ?? []).map((r, i) => ({
        userId: r.is_self ? (context.userId as string) : "",
        displayName: r.display_name ?? null,
        score: Number(r.score ?? 0),
        rank: r.rank ?? i + 1,
        rewardAmount: Number(r.reward_amount ?? 0),
      })),
    };
  });
