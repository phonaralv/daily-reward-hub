/**
 * Daily Reward — single entry point: `claim_daily_reward()` RPC.
 *
 * The RPC INSERTs into `ledger_entries` (UNIQUE(user_id, ref_kind, ref_id)),
 * which fires `apply_ledger_to_wallet` trigger to credit `wallets.balance`.
 *
 * Errors:
 *   - already_claimed (sqlstate P0001) — user already claimed today
 *   - unauthorized   (sqlstate 42501) — no session
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DailyClaimResult {
  amount: number;
  newBalance: number;
  alreadyClaimed: boolean;
}

export const claimDailyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailyClaimResult> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("claim_daily_reward");
    if (error) {
      if (error.message?.includes("already_claimed") || error.code === "P0001") {
        return { amount: 0, newBalance: 0, alreadyClaimed: true };
      }
      throw new Error(error.message);
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      amount: Number(row?.amount ?? 0),
      newBalance: Number(row?.new_balance ?? 0),
      alreadyClaimed: false,
    };
  });
