/**
 * VIP entity — server-derived tier (0-5) and multiplier.
 *
 * Tier and multiplier are computed exclusively in Postgres
 * (`public.vip_tier`, `public.vip_multiplier`). The client only
 * displays them. ANY client-side recomputation of the multiplier
 * is forbidden and enforced by Guard #13.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getMyVip } from "@/lib/vip.functions";

export interface VipDTO {
  tier: number;
  multiplier: number;
  amount30d: number;
}

export const VIP_QK = ["vip", "me"] as const;

export const vipQueryOptions = queryOptions({
  queryKey: VIP_QK,
  queryFn: () => getMyVip(),
  staleTime: 60_000,
});

export function useMyVip() {
  return useQuery(vipQueryOptions);
}
