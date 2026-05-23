/**
 * Streak read-only server function.
 *
 * INVARIANT: No write here. The only streak mutator is the
 * `claim_daily_reward()` RPC (see daily-reward.functions.ts).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { StreakDTO } from "@/entities/streak";

export const getStreak = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StreakDTO> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("streaks")
      .select("user_id, current_day, last_claim_date, longest, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      return {
        userId,
        currentDay: 0,
        lastClaimDate: null,
        longest: 0,
        updatedAt: new Date(0).toISOString(),
      };
    }
    return {
      userId: data.user_id,
      currentDay: data.current_day,
      lastClaimDate: data.last_claim_date,
      longest: data.longest,
      updatedAt: data.updated_at,
    };
  });
