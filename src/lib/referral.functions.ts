/**
 * Referral server functions — RPC-only path to ledger_entries.
 *
 * INVARIANT: This file does NOT write to ledger_entries or wallets
 * directly. Every credit flows through `claim_referral_reward()` which
 * routes through `_apply_reward()` (single entry point) and runs
 * `evaluate_referral_fraud()` first.
 *
 * Reward amount: server-only (currently 500 base, then VIP multiplier).
 * Client cannot influence it; the only input is the target referee uuid.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ReferralDTO, ReferralStatus } from "@/entities/referral";

const RedeemInput = z.object({
  code: z
    .string()
    .length(6)
    .regex(/^[A-Z0-9]+$/i, "code must be 6 alphanumerics"),
});

const ClaimInput = z.object({
  referee: z.string().uuid(),
});

export const getMyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ code: string }> => {
    const { supabase, userId } = context;
    // Read existing first; only create if absent (idempotent on client).
    const { data: existing, error: readErr } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (existing?.code) return { code: existing.code };

    const { data, error } = await supabase.rpc("create_referral_code");
    if (error) throw new Error(error.message);
    return { code: String(data ?? "") };
  });

export const listMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReferralDTO[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("referrals")
      .select("id, referee_id, code, status, created_at, rewarded_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      refereeId: r.referee_id,
      code: r.code,
      status: r.status as ReferralStatus,
      createdAt: r.created_at,
      rewardedAt: r.rewarded_at,
    }));
  });

export const redeemReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RedeemInput.parse(input))
  .handler(
    async ({ data, context }): Promise<{
      status: string;
      alreadyReferred: boolean;
      selfReferral: boolean;
      notFound: boolean;
    }> => {
      const { supabase } = context;
      const { error } = await supabase.rpc("redeem_referral_code", {
        p_code: data.code.toUpperCase(),
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("already_referred")) {
          return { status: "already", alreadyReferred: true, selfReferral: false, notFound: false };
        }
        if (msg.includes("self_referral")) {
          return { status: "self", alreadyReferred: false, selfReferral: true, notFound: false };
        }
        if (msg.includes("code_not_found")) {
          return { status: "not_found", alreadyReferred: false, selfReferral: false, notFound: true };
        }
        throw new Error(msg);
      }
      return { status: "pending", alreadyReferred: false, selfReferral: false, notFound: false };
    },
  );

export const claimReferralReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClaimInput.parse(input))
  .handler(
    async ({ data, context }): Promise<{
      amount: number;
      newBalance: number;
      status: string;
      blocked: boolean;
    }> => {
      const { supabase } = context;
      const { data: rows, error } = await supabase.rpc("claim_referral_reward", {
        p_referee: data.referee,
      });
      if (error) {
        const msg = error.message ?? "";
        if (msg.includes("already_claimed")) {
          return { amount: 0, newBalance: 0, status: "already", blocked: false };
        }
        if (msg.includes("blocked_fraud")) {
          return { amount: 0, newBalance: 0, status: "fraud", blocked: true };
        }
        if (msg.includes("referral_not_found")) {
          return { amount: 0, newBalance: 0, status: "not_found", blocked: false };
        }
        throw new Error(msg);
      }
      const row = Array.isArray(rows) ? rows[0] : rows;
      const status = String(row?.status ?? "ok");
      return {
        amount: Number(row?.amount ?? 0),
        newBalance: Number(row?.new_balance ?? 0),
        status,
        blocked: status === "fraud" || status === "review",
      };
    },
  );
