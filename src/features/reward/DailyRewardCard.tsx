/**
 * DailyRewardCard — claim today's reward, with 7-day streak.
 *
 * All credits flow through `claimDailyReward` → `claim_daily_reward()` RPC
 * → `ledger_entries` INSERT → trigger updates `wallets.balance` AND `streaks`.
 * No direct wallet/streak mutation here.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { claimDailyReward } from "@/lib/daily-reward.functions";
import { WALLET_QK } from "@/entities/wallet";
import { LEDGER_QK } from "@/entities/ledger";
import { STREAK_QK, useStreak } from "@/entities/streak";
import { PhonAmount } from "@/shared/ui/PhonAmount";
import { notify } from "@/shared/lib/notify";
import { StreakDots } from "./StreakDots";

const REWARD_BY_DAY = [100, 100, 120, 150, 180, 220, 260, 400] as const;

export function DailyRewardCard() {
  const claim = useServerFn(claimDailyReward);
  const qc = useQueryClient();
  const streak = useStreak();
  const currentDay = streak.data?.currentDay ?? 0;
  const nextDay = ((currentDay % 7) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
  const previewAmount = REWARD_BY_DAY[nextDay];

  const m = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      if (res.alreadyClaimed) {
        notify.info("오늘은 이미 보상을 받았어요.");
      } else {
        notify.reward(`+${res.amount} PHON 적립!`, {
          description: `${res.streakDay}일차 · 내일 +${res.nextAmount} PHON`,
        });
      }
      qc.invalidateQueries({ queryKey: WALLET_QK });
      qc.invalidateQueries({ queryKey: LEDGER_QK });
      qc.invalidateQueries({ queryKey: STREAK_QK });
    },
    onError: (e) => notify.error((e as Error).message ?? "보상 적립 실패"),
  });

  return (
    <section className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">데일리 보상</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            오늘 받기 +<PhonAmount value={previewAmount} /> PHON · 7일차 +
            <PhonAmount value={400} />
          </p>
        </div>
        <button
          type="button"
          onClick={() => m.mutate()}
          disabled={m.isPending}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {m.isPending ? "처리 중..." : "오늘 받기"}
        </button>
      </div>
      <div className="mt-4">
        <StreakDots />
      </div>
    </section>
  );
}
