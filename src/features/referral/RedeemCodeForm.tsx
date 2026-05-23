/**
 * RedeemCodeForm — referee submits a 6-char referrer code.
 * One-shot: server rejects duplicate / self / unknown codes.
 */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { redeemReferralCode } from "@/lib/referral.functions";
import { notify } from "@/shared/lib/notify";

export function RedeemCodeForm() {
  const redeem = useServerFn(redeemReferralCode);
  const [value, setValue] = useState("");
  const m = useMutation({
    mutationFn: (code: string) => redeem({ data: { code } }),
    onSuccess: (res) => {
      if (res.alreadyReferred) notify.info("이미 추천 코드를 등록했어요.");
      else if (res.selfReferral) notify.info("본인 코드는 사용할 수 없어요.");
      else if (res.notFound) notify.error("존재하지 않는 코드입니다.");
      else notify.reward("추천 코드가 등록되었습니다.");
      setValue("");
    },
    onError: (e) => notify.error((e as Error).message ?? "등록 실패"),
  });

  const isValid = /^[A-Za-z0-9]{6}$/.test(value);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) m.mutate(value);
      }}
      className="rounded-2xl border border-border bg-surface-1 p-4 space-y-2"
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        추천인 코드 등록
      </p>
      <div className="flex gap-2">
        <input
          inputMode="text"
          autoCapitalize="characters"
          maxLength={6}
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 font-mono text-base tracking-widest text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!isValid || m.isPending}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          등록
        </button>
      </div>
    </form>
  );
}
