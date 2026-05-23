/**
 * Referral entity — codes, referrals, status DTOs.
 *
 * INVARIANT: All mutations go through SECURITY DEFINER RPCs.
 *   - `create_referral_code()`        — issue/return user's code
 *   - `redeem_referral_code(code)`    — referee registers a referrer
 *   - `claim_referral_reward(referee)` — referrer claims via `_apply_reward()`
 *
 * Reward amounts and fraud rules are server-only. Client never knows the
 * base amount or the VIP multiplier.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  getMyReferralCode,
  listMyReferrals,
} from "@/lib/referral.functions";

export type ReferralStatus = "pending" | "rewarded" | "review" | "fraud";

export interface ReferralDTO {
  id: string;
  refereeId: string;
  code: string;
  status: ReferralStatus;
  createdAt: string;
  rewardedAt: string | null;
}

export const REFERRAL_CODE_QK = ["referral", "code", "me"] as const;
export const REFERRAL_LIST_QK = ["referral", "list", "me"] as const;

export const referralCodeQueryOptions = queryOptions({
  queryKey: REFERRAL_CODE_QK,
  queryFn: () => getMyReferralCode(),
  staleTime: 60_000,
});

export const referralListQueryOptions = queryOptions({
  queryKey: REFERRAL_LIST_QK,
  queryFn: () => listMyReferrals(),
  staleTime: 10_000,
});

export function useMyReferralCode() {
  return useQuery(referralCodeQueryOptions);
}

export function useMyReferrals() {
  return useQuery(referralListQueryOptions);
}
