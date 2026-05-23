/**
 * DailyRewardCard — claim today's reward.
 *
 * All credits flow through `claimDailyReward` → `claim_daily_reward()` RPC
 * → `ledger_entries` INSERT → trigger updates `wallets.balance`.
 * No direct wallet mutation.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { claimDailyReward } from "@/lib/daily-reward.functions";
import { WALLET_QK } from "@/entities/wallet";
import { LEDGER_QK } from "@/entities/ledger";
import { PhonAmount } from "@/shared/ui/PhonAmount";
import { notify } from "@/shared/lib/notify";

export function DailyRewardCard() {
  const claim = useServerFn(claimDailyReward);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      if (res.alreadyClaimed) {
        notify.info("오늘은 이미 보상을 받았어요.");
      } else {
        notify.success(`+${res.amount} PHON 적립!`);
      }
      qc.invalidateQueries({ queryKey: WALLET_QK });
      qc.invalidateQueries({ queryKey: LEDGER_QK });
    },
    onError: (e) => notify.error((e as Error).message ?? "보상 적립 실패"),
  });

  return (
    <section className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">데일리 보상</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            매일 1회, <PhonAmount value={100} /> 적립
          </p>
        </div>
        <button
          type="button"
          onClick={() => m.mutate()}
          disabled={m.isPending}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {m.isPending ? "처리 중..." : "오늘 보상 받기"}
        </button>
      </div>
    </section>
  );
}
