/**
 * QuestList — list active quests with progress + claim buttons.
 *
 * Read path: `useMyQuests()` → `listMyQuests` server fn.
 * Write path: `claimQuest({ data: { code } })` → `claim_quest()` RPC →
 *             ledger_entries INSERT (single entry point).
 * Progress is normally driven by app events via `progressQuest`, not
 * by this component.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { claimQuest } from "@/lib/quest.functions";
import { useMyQuests, QUEST_QK, type QuestDTO } from "@/entities/quest";
import { WALLET_QK } from "@/entities/wallet";
import { LEDGER_QK } from "@/entities/ledger";
import { PhonAmount } from "@/shared/ui/PhonAmount";
import { notify } from "@/shared/lib/notify";

function QuestRow({ q }: { q: QuestDTO }) {
  const claim = useServerFn(claimQuest);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => claim({ data: { code: q.code } }),
    onSuccess: (res) => {
      if (res.alreadyClaimed) notify.info("이미 보상을 받았어요.");
      else if (res.notCompleted) notify.info("아직 미완료입니다.");
      else notify.reward(`+${res.amount} PHON · ${q.title}`);
      qc.invalidateQueries({ queryKey: QUEST_QK });
      qc.invalidateQueries({ queryKey: WALLET_QK });
      qc.invalidateQueries({ queryKey: LEDGER_QK });
    },
    onError: (e) => notify.error((e as Error).message ?? "보상 수령 실패"),
  });

  const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
  const isClaimed = !!q.claimedAt;
  const isCompleted = !!q.completedAt;

  return (
    <li className="rounded-2xl border border-border bg-surface-1 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-foreground">{q.title}</h4>
          {q.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{q.description}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            보상 +<PhonAmount value={q.rewardAmount} /> PHON · {q.progress}/{q.target}
          </p>
        </div>
        <button
          type="button"
          onClick={() => m.mutate()}
          disabled={!isCompleted || isClaimed || m.isPending}
          className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {isClaimed ? "수령 완료" : isCompleted ? "보상 받기" : "진행 중"}
        </button>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

export function QuestList() {
  const { data, isLoading } = useMyQuests();
  if (isLoading) {
    return (
      <p className="rounded-2xl border border-border bg-surface-1 p-4 text-xs text-muted-foreground">
        미션을 불러오는 중...
      </p>
    );
  }
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-border bg-surface-1 p-4 text-xs text-muted-foreground">
        진행 중인 미션이 없어요.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {data.map((q) => (
        <QuestRow key={q.code} q={q} />
      ))}
    </ul>
  );
}
