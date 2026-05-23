/**
 * useLedgerStream — single root-level realtime subscription.
 *
 * Subscribes to `ledger_entries` INSERTs (RLS filters to current user)
 * and invalidates wallet + ledger react-query caches. This is the only
 * realtime channel for the reward loop in Phase 1.
 *
 * Mount EXACTLY ONCE at `__root.tsx`. Per-component mounts are forbidden.
 */
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WALLET_QK } from "@/entities/wallet";
import { LEDGER_QK } from "@/entities/ledger";

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
          () => {
            qc.invalidateQueries({ queryKey: WALLET_QK });
            qc.invalidateQueries({ queryKey: LEDGER_QK });
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
