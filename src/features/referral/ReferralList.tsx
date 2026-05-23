/**
 * ReferralList — referrer view of their invitees + claim button.
 * Claim path: `claim_referral_reward(referee)` → `_apply_reward()` →
 * ledger_entries INSERT (single entry point). Server enforces fraud
 * rules via `evaluate_referral_fraud()` BEFORE the credit.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  useMyReferrals,
  REFERRAL_LIST_QK,
  type ReferralDTO,
} from "@/entities/referral";
import { WALLET_QK } from "@/entities/wallet";
import { LEDGER_QK } from "@/entities/ledger";
import { claimReferralReward } from "@/lib/referral.functions";
import { notify } from "@/shared/lib/notify";

function shortId(id: string) {
  return id.slice(0, 8);
}

function statusLabel(s: ReferralDTO["status"]) {
  switch (s) {
    case "rewarded": return "지급 완료";
    case "review": return "검토 중";
    case "fraud": return "차단됨";
    default: return "수령 대기";
  }
}

export function ReferralList() {
  const { data, isLoading } = useMyReferrals();
  const qc = useQueryClient();
  const claim = useServerFn(claimReferralReward);

  const m = useMutation({
    mutationFn: (referee: string) => claim({ data: { referee } }),
    onSuccess: (res) => {
      if (res.status === "rewarded") {
        notify.reward(`+${res.amount} PHON · 추천 보상`);
      } else if (res.status === "fraud") {
        notify.error("부정 행위가 감지되어 차단되었습니다.");
      } else if (res.status === "review") {
        notify.info("검토 대기 상태입니다.");
      } else if (res.status === "already") {
        notify.info("이미 수령했습니다.");
      } else if (res.status === "not_found") {
        notify.error("추천 정보를 찾을 수 없습니다.");
      }
      qc.invalidateQueries({ queryKey: REFERRAL_LIST_QK });
      qc.invalidateQueries({ queryKey: WALLET_QK });
      qc.invalidateQueries({ queryKey: LEDGER_QK });
    },
    onError: (e) => notify.error((e as Error).message ?? "보상 수령 실패"),
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }
  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">
        아직 추천한 친구가 없어요.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const disabled =
          r.status === "rewarded" || r.status === "fraud" || m.isPending;
        return (
          <li
            key={r.id}
            className="rounded-2xl border border-border bg-surface-1 p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-mono text-sm text-foreground">
                {shortId(r.refereeId)}…
              </p>
              <p className="text-xs text-muted-foreground">
                {statusLabel(r.status)} ·{" "}
                {new Date(r.createdAt).toLocaleDateString("ko-KR")}
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => m.mutate(r.refereeId)}
              className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {r.status === "rewarded" ? "완료" : "보상 받기"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
