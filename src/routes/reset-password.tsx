/**
 * /reset-password — 메일 링크를 통해 도착한 사용자의 새 비밀번호 설정.
 * Supabase가 URL hash로 recovery 세션을 자동 수립합니다.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthShell } from "@/features/auth/ui/AuthShell";
import { NeonInput } from "@/features/auth/ui/NeonInput";
import { NeonButton } from "@/features/auth/ui/NeonButton";
import {
  PasswordStrengthMeter,
  scorePassword,
} from "@/features/auth/ui/PasswordStrengthMeter";
import { updatePassword } from "@/features/auth/auth";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/shared/lib/notify";

type BtnState = "idle" | "loading" | "success" | "error";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "새 비밀번호 설정 — PHONARA" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [state, setState] = useState<BtnState>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    // recovery 링크는 hash로 세션을 만든다. 짧게 폴링.
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        setHasSession(true);
        return;
      }
      if (tries >= 20) {
        setHasSession(false);
        return;
      }
      setTimeout(tick, 150);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  const strength = useMemo(() => scorePassword(pw), [pw]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      setErrMsg("8자 이상이어야 합니다.");
      setState("error");
      return;
    }
    if (pw !== pw2) {
      setErrMsg("두 비밀번호가 일치하지 않습니다.");
      setState("error");
      return;
    }
    if (strength.score < 2) {
      setErrMsg("비밀번호가 너무 약합니다.");
      setState("error");
      return;
    }
    setState("loading");
    const { error } = await updatePassword(pw);
    if (error) {
      setErrMsg(error.message);
      setState("error");
      return;
    }
    setState("success");
    notify.success("비밀번호가 변경되었어요");
    setTimeout(() => navigate({ to: "/" }), 600);
  };

  if (hasSession === false) {
    return (
      <AuthShell
        eyebrow="만료된 링크"
        title="세션을 확인할 수 없어요"
        subtitle="링크가 만료되었거나 이미 사용되었어요. 재설정 메일을 다시 요청해주세요."
        footer={
          <Link to="/reset-password-request" className="font-medium text-foreground hover:underline">
            재설정 메일 다시 보내기
          </Link>
        }
      >
        <NeonButton variant="secondary" onClick={() => navigate({ to: "/login" })}>
          로그인으로 돌아가기
        </NeonButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="새 비밀번호 설정"
      title="새 비밀번호를 입력해주세요"
      subtitle="강력한 비밀번호일수록 안전합니다."
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <NeonInput
            label="새 비밀번호"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setErrMsg(null);
              if (state === "error") setState("idle");
            }}
            required
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="rounded-lg p-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPw ? "숨기기" : "보기"}
              </button>
            }
          />
          <PasswordStrengthMeter password={pw} />
        </div>
        <NeonInput
          label="비밀번호 확인"
          type={showPw ? "text" : "password"}
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => {
            setPw2(e.target.value);
            setErrMsg(null);
            if (state === "error") setState("idle");
          }}
          error={errMsg}
          required
        />
        <NeonButton type="submit" state={state} disabled={hasSession !== true}>
          {state === "success" ? "변경 완료" : "비밀번호 변경"}
        </NeonButton>
      </form>
    </AuthShell>
  );
}
