/**
 * Quest server functions — list + progress + claim.
 *
 * INVARIANT: All mutations go through SECURITY DEFINER RPCs. No direct
 * write to user_quests or ledger_entries from this file. Reward amounts
 * are sourced from `quests.reward_amount` server-side — client cannot
 * influence them; they only send the quest code (text).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { QuestDTO } from "@/entities/quest";

const QuestCode = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/, "quest code must be snake_case");

const ProgressInput = z.object({
  code: QuestCode,
  delta: z.number().int().min(1).max(1000),
});

const ClaimInput = z.object({ code: QuestCode });

export const listMyQuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QuestDTO[]> => {
    const { supabase, userId } = context;
    const [{ data: quests, error: qErr }, { data: progress, error: pErr }] =
      await Promise.all([
        supabase
          .from("quests")
          .select("code, title, description, target, reward_amount, sort_order")
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("user_quests")
          .select("quest_code, progress, completed_at, claimed_at")
          .eq("user_id", userId),
      ]);
    if (qErr) throw new Error(qErr.message);
    if (pErr) throw new Error(pErr.message);

    const byCode = new Map(
      (progress ?? []).map((p) => [p.quest_code, p] as const),
    );
    return (quests ?? []).map((q) => {
      const p = byCode.get(q.code);
      return {
        code: q.code,
        title: q.title,
        description: q.description,
        target: q.target,
        rewardAmount: Number(q.reward_amount),
        sortOrder: q.sort_order,
        progress: p?.progress ?? 0,
        completedAt: p?.completed_at ?? null,
        claimedAt: p?.claimed_at ?? null,
      };
    });
  });

export interface QuestProgressResult {
  progress: number;
  target: number;
  completed: boolean;
}

export const progressQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProgressInput.parse(input))
  .handler(async ({ data, context }): Promise<QuestProgressResult> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("progress_quest", {
      p_code: data.code,
      p_delta: data.delta,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return {
      progress: Number(row?.progress ?? 0),
      target: Number(row?.target ?? 0),
      completed: Boolean(row?.completed),
    };
  });

export interface QuestClaimResult {
  amount: number;
  newBalance: number;
  alreadyClaimed: boolean;
  notCompleted: boolean;
}

export const claimQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClaimInput.parse(input))
  .handler(async ({ data, context }): Promise<QuestClaimResult> => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("claim_quest", {
      p_code: data.code,
    });
    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("already_claimed")) {
        return { amount: 0, newBalance: 0, alreadyClaimed: true, notCompleted: false };
      }
      if (msg.includes("not_completed")) {
        return { amount: 0, newBalance: 0, alreadyClaimed: false, notCompleted: true };
      }
      throw new Error(msg);
    }
    const row = Array.isArray(rows) ? rows[0] : rows;
    return {
      amount: Number(row?.amount ?? 0),
      newBalance: Number(row?.new_balance ?? 0),
      alreadyClaimed: false,
      notCompleted: false,
    };
  });
