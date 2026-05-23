/**
 * Wallet entity — read-only DTO + react-query cache key + hook.
 *
 * INVARIANT: wallets table is never written to from code.
 * The only mutation path is `ledger_entries` INSERT → trigger
 * `apply_ledger_to_wallet` → wallets.balance upsert. See db migration
 * `20260522175335_*.sql` and `claim_daily_reward()` RPC.
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getWallet } from "@/lib/wallet.functions";

export interface WalletDTO {
  userId: string;
  balance: number;
  updatedAt: string;
}

export const WALLET_QK = ["wallet", "me"] as const;

export const walletQueryOptions = queryOptions({
  queryKey: WALLET_QK,
  queryFn: () => getWallet(),
  staleTime: 10_000,
});

export function useWallet() {
  return useQuery(walletQueryOptions);
}
