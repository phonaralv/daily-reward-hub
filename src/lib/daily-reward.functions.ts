/**
 * Daily Reward — single entry point: `claim_daily_reward()` RPC.
 *
 * The RPC atomically:
 *   1. Validates streak (UTC date arithmetic)
 *   2. INSERTs into `ledger_entries` (UNIQUE → idempotent)
 *   3. Trigger `apply_ledger_to_wallet` credits `wallets.balance`
 *   4. Upserts `streaks` (current_day, last_claim_date, longest)
 *
 * Errors:
 *   - already_claimed (P0001) — user already claimed today (or duplicate)
 *   - unauthorized   (42501)  — no session
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DailyClaimResult {
  amount: number;
  newBalance: number;
  streakDay: number;
  nextAmount: number;
  alreadyClaimed: boolean;
}

export const claimDailyReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailyClaimResult> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("claim_daily_reward");
    if (error) {
      if (error.message?.includes("already_claimed") || error.code === "P0001") {
        return {
          amount: 0,
          newBalance: 0,
          streakDay: 0,
          nextAmount: 0,
          alreadyClaimed: true,
        };
      }
      throw new Error(error.message);
    }
    const row = Array.isArray(data) ? data[0] : data;
    return {
      amount: Number(row?.amount ?? 0),
      newBalance: Number(row?.new_balance ?? 0),
      streakDay: Number(row?.streak_day ?? 0),
      nextAmount: Number(row?.next_amount ?? 0),
      alreadyClaimed: false,
    };
  });
