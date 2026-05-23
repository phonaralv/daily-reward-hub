/**
 * Ledger entity — append-only event log DTO.
 *
 * INVARIANT: `ledger_entries` is the single entry point for any reward
 * credit/debit. Direct INSERT from the codebase is forbidden by ESLint;
 * all writes go through SECURITY DEFINER RPCs (e.g. `claim_daily_reward`).
 * UPDATE/DELETE are permanently forbidden (RLS denies + no policy).
 */
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getLedger } from "@/lib/wallet.functions";

export type LedgerKind = "daily_reward" | "quest_reward" | "adjustment" | "spend";

export interface LedgerEntryDTO {
  id: string;
  userId: string;
  kind: LedgerKind;
  amount: number;
  refKind: string;
  refId: string;
  createdAt: string;
}

export const LEDGER_QK = ["ledger", "me"] as const;

export const ledgerQueryOptions = (limit = 20) =>
  queryOptions({
    queryKey: [...LEDGER_QK, { limit }] as const,
    queryFn: () => getLedger({ data: { limit } }),
    staleTime: 10_000,
  });

export function useLedger(limit = 20) {
  return useQuery(ledgerQueryOptions(limit));
}
