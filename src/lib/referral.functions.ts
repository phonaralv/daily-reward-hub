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
import { AppError } from "@/lib/errors/app-error";

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

    const { data: existing, error: readErr } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .maybeSingle();

    if (readErr) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: readErr.message,
        statusCode: 500,
      });
    }
    if (existing?.code) return { code: existing.code };

    const { data, error } = await supabase.rpc("create_referral_code");
    if (error) {
      throw AppError.fromRpcError(error);
    }
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

    if (error) {
      throw new AppError({
        code: "INTERNAL_ERROR",
        message: error.message,
        statusCode: 500,
      });
    }

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
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { error } = await supabase.rpc("redeem_referral_code", {
      p_code: data.code.toUpperCase(),
    });

    if (error) {
      const appError = AppError.fromRpcError(error);
      // Return structured response for known business errors instead of throwing
      if (
        appError.code === "REFERRAL_ALREADY_REFERRED" ||
        appError.code === "REFERRAL_SELF_REFERRAL" ||
        appError.code === "REFERRAL_CODE_NOT_FOUND"
      ) {
        return {
          status: appError.code === "REFERRAL_ALREADY_REFERRED" ? "already" : appError.code === "REFERRAL_SELF_REFERRAL" ? "self" : "not_found",
          alreadyReferred: appError.code === "REFERRAL_ALREADY_REFERRED",
          selfReferral: appError.code === "REFERRAL_SELF_REFERRAL",
          notFound: appError.code === "REFERRAL_CODE_NOT_FOUND",
        };
      }
      throw appError;
    }

    return {
      status: "pending",
      alreadyReferred: false,
      selfReferral: false,
      notFound: false,
    };
  });

export const claimReferralReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ClaimInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: rows, error } = await supabase.rpc("claim_referral_reward", {
      p_referee: data.referee,
    });

    if (error) {
      const appError = AppError.fromRpcError(error);

      if (appError.code === "LEDGER_ALREADY_CLAIMED") {
        return { amount: 0, newBalance: 0, status: "already", blocked: false };
      }
      if (appError.code === "REFERRAL_BLOCKED_FRAUD") {
        return { amount: 0, newBalance: 0, status: "fraud", blocked: true };
      }
      if (appError.code === "REFERRAL_NOT_FOUND") {
        return { amount: 0, newBalance: 0, status: "not_found", blocked: false };
      }

      throw appError;
    }

    const row = Array.isArray(rows) ? rows[0] : rows;
    const status = String(row?.status ?? "ok");

    return {
      amount: Number(row?.amount ?? 0),
      newBalance: Number(row?.new_balance ?? 0),
      status,
      blocked: status === "fraud" || status === "review",
    };
  });
