/**
 * useLedgerStream — single root-level realtime subscription.
 *
 * Subscribes to `ledger_entries` INSERTs (RLS filters to current user) and:
 *   1. Invalidates wallet + ledger react-query caches
 *   2. Pushes the new entry into `rewardClaimSource` (PresenceSource adapter)
 *      so LiveBadge / overlays can react without their own subscription.
 *
 * Mount EXACTLY ONCE at `__root.tsx`. Per-route mounts are forbidden
 * (enforced by Guard #11 in scripts/guards.sh).
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WALLET_QK } from "@/entities/wallet";
import { LEDGER_QK } from "@/entities/ledger";
import { STREAK_QK } from "@/entities/streak";
import { QUEST_QK } from "@/entities/quest";
import { pushRewardClaim } from "@/shared/lib/presence/sources/rewardClaimSource";

interface LedgerInsertPayload {
  kind?: string;
  amount?: number;
  ref_kind?: string;
  ref_id?: string;
  created_at?: string;
}

export function useLedgerStream() {
  const qc = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId || cancelled) return;

      channel = supabase
        .channel(`ledger:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "ledger_entries",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            qc.invalidateQueries({ queryKey: WALLET_QK });
            qc.invalidateQueries({ queryKey: LEDGER_QK });
            qc.invalidateQueries({ queryKey: STREAK_QK });
            qc.invalidateQueries({ queryKey: QUEST_QK });

            const row = payload.new as LedgerInsertPayload;
            if (row?.kind && typeof row.amount === "number") {
              pushRewardClaim({
                kind: row.kind,
                amount: row.amount,
                refKind: row.ref_kind ?? "",
                refId: row.ref_id ?? "",
                at: row.created_at ? Date.parse(row.created_at) : Date.now(),
              });
            }
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);
}
