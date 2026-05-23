/**
 * Wallet + Ledger read-only server functions.
 *
 * INVARIANT: NO INSERT/UPDATE/DELETE on `wallets` or `ledger_entries` here.
 * Writes go through RPCs (see `daily-reward.functions.ts`).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { WalletDTO } from "@/entities/wallet";
import type { LedgerEntryDTO, LedgerKind } from "@/entities/ledger";

const LedgerInput = z.object({ limit: z.number().int().min(1).max(100).default(20) });

export const getWallet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletDTO> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("wallets")
      .select("user_id, balance, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      return { userId, balance: 0, updatedAt: new Date(0).toISOString() };
    }
    return {
      userId: data.user_id,
      balance: Number(data.balance),
      updatedAt: data.updated_at,
    };
  });

export const getLedger = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LedgerInput.parse(input))
  .handler(async ({ data, context }): Promise<LedgerEntryDTO[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("ledger_entries")
      .select("id, user_id, kind, amount, ref_kind, ref_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      kind: r.kind as LedgerKind,
      amount: Number(r.amount),
      refKind: r.ref_kind,
      refId: r.ref_id,
      createdAt: r.created_at,
    }));
  });
