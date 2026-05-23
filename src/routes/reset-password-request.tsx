/**
 * /reset-password-request — 비밀번호 재설정 메일 요청.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "@/features/auth/ui/AuthShell";
import { NeonInput } from "@/features/auth/ui/NeonInput";
import { NeonButton } from "@/features/auth/ui/NeonButton";
import { requestPasswordReset } from "@/features/auth/auth";
import { notify } from "@/shared/lib/notify";

type BtnState = "idle" | "loading" | "success" | "error";

export const Route = createFileRoute("/reset-password-request")({
  head: () => ({
    meta: [
      { title: "비밀번호 재설정 — PHONARA" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordRequestPage,
});

function ResetPasswordRequestPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<BtnState>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrMsg("이메일을 입력해주세요.");
      setState("error");
      return;
    }
    setState("loading");
    const { error } = await requestPasswordReset(email);
    if (error) {
      setErrMsg(error.message);
      setState("error");
      return;
    }
    setState("success");
    notify.success("재설정 메일을 보냈어요", {
      description: `${email} 메일함을 확인해주세요.`,
    });
  };

  return (
    <AuthShell
      eyebrow="비밀번호 재설정"
      title="비밀번호를 잊으셨나요?"
      subtitle="가입한 이메일을 입력하시면 재설정 링크를 보내드려요."
      footer={
        <Link to="/login" className="font-medium text-foreground hover:underline">
          로그인으로 돌아가기
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        <NeonInput
          label="이메일"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrMsg(null);
            if (state === "error") setState("idle");
          }}
          error={errMsg}
          required
        />
        <NeonButton type="submit" state={state}>
          {state === "success" ? "메일 발송 완료" : "재설정 링크 받기"}
        </NeonButton>
      </form>
    </AuthShell>
  );
}
