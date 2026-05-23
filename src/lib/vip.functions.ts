/**
 * VIP server functions — pure READ wrapper.
 *
 * SECURITY: Tier and multiplier are computed inside Postgres
 * (`vip_tier` / `vip_multiplier`). This file never re-derives them
 * client- or server-side. The 30d window aggregate is informational.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { VipDTO } from "@/entities/vip";

export const getMyVip = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VipDTO> => {
    const { supabase, userId } = context;
    const [{ data: tierData, error: tErr }, { data: multData, error: mErr }] =
      await Promise.all([
        supabase.rpc("vip_tier", { p_user_id: userId }),
        supabase.rpc("vip_multiplier", { p_user_id: userId }),
      ]);
    if (tErr) throw new Error(tErr.message);
    if (mErr) throw new Error(mErr.message);

    // Informational 30d sum (RLS limits to self).
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await supabase
      .from("ledger_entries")
      .select("amount")
      .gt("amount", 0)
      .gte("created_at", since);
    const amount30d = (rows ?? []).reduce(
      (acc, r) => acc + Number(r.amount ?? 0),
      0,
    );

    return {
      tier: Number(tierData ?? 0),
      multiplier: Number(multData ?? 1),
      amount30d,
    };
  });
