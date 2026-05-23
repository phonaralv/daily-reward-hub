/**
 * ReferralCard — shows the user's referral code with copy.
 * Code is generated server-side (`create_referral_code` RPC).
 */
import { useState } from "react";
import { useMyReferralCode } from "@/entities/referral";
import { notify } from "@/shared/lib/notify";

export function ReferralCard() {
  const { data, isLoading } = useMyReferralCode();
  const [copied, setCopied] = useState(false);
  const code = data?.code ?? "";

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      notify.info("코드를 복사했어요.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify.error("복사에 실패했어요.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        내 추천 코드
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="font-mono text-2xl font-semibold tracking-widest text-foreground">
          {isLoading ? "······" : code || "————"}
        </span>
        <button
          type="button"
          onClick={copy}
          disabled={!code}
          className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        친구가 이 코드를 등록하면 검증 후 보상이 지급됩니다.
      </p>
    </div>
  );
}
