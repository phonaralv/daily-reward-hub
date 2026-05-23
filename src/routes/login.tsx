/**
 * /login — Magic Link 우선 + 이메일/비밀번호 토글.
 * 끝판왕 UI: AuthShell + AuthTabs + NeonInput + NeonButton.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell } from "@/features/auth/ui/AuthShell";
import { AuthTabs } from "@/features/auth/ui/AuthTabs";
import { NeonInput } from "@/features/auth/ui/NeonInput";
import { NeonButton } from "@/features/auth/ui/NeonButton";
import { AuthDivider } from "@/features/auth/ui/AuthDivider";
import { sendMagicLink, signIn } from "@/features/auth/auth";
import { useAuth } from "@/features/auth/useAuth";
import { notify } from "@/shared/lib/notify";

type Mode = "magic" | "password";
type BtnState = "idle" | "loading" | "success" | "error";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "로그인 — PHONARA" },
      {
        name: "description",
        content: "PHONARA에 안전하게 로그인하세요. Magic Link 또는 비밀번호.",
      },
    ],
  }),
  component: LoginPage,
});

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [state, setState] = useState<BtnState>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate({ to: "/" });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const reset = () => {
    setErrMsg(null);
    if (state === "error" || state === "success") setState("idle");
  };

  const submitMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrMsg("이메일을 입력해주세요.");
      setState("error");
      return;
    }
    setState("loading");
    setErrMsg(null);
    const { error } = await sendMagicLink(email);
    if (error) {
      setErrMsg(error.message);
      setState("error");
      notify.error("로그인 링크 발송 실패", { description: error.message });
      return;
    }
    setState("success");
    notify.success("로그인 링크를 보냈어요", {
      description: `${email} 메일함을 확인해주세요.`,
    });
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrMsg("이메일과 비밀번호를 모두 입력해주세요.");
      setState("error");
      return;
    }
    setState("loading");
    setErrMsg(null);
    const { error } = await signIn({ email, password });
    if (error) {
      setErrMsg("이메일 또는 비밀번호가 올바르지 않습니다.");
      setState("error");
      notify.error("로그인 실패", { description: "정보를 다시 확인해주세요." });
      return;
    }
    setState("success");
    notify.success("환영합니다");
    setTimeout(() => navigate({ to: "/" }), 400);
  };

  const eyebrow = "Secure access · End-to-end encrypted";

  return (
    <AuthShell
      eyebrow={eyebrow}
      title={
        <>
          다시 오신 것을 환영합니다,{" "}
          <span
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(190 95% 60%), hsl(268 92% 68%), hsl(330 95% 65%))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            PHONARA
          </span>
        </>
      }
      subtitle="Magic Link 한 번이면 끝나요. 비밀번호 로그인도 지원합니다."
      footer={
        <>
          처음이신가요?{" "}
          <Link to="/signup" className="font-medium text-foreground hover:text-foreground/90 underline-offset-4 hover:underline">
            회원가입
          </Link>
        </>
      }
    >
      <AuthTabs<Mode>
        value={mode}
        onChange={(m) => {
          setMode(m);
          reset();
        }}
        options={[
          { value: "magic", label: "Magic Link" },
          { value: "password", label: "비밀번호" },
        ]}
      />

      {mode === "magic" ? (
        <form onSubmit={submitMagic} className="mt-5 space-y-4" noValidate>
          <NeonInput
            label="이메일"
            type="email"
            autoComplete="email"
            inputMode="email"
            icon={<MailIcon />}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              reset();
            }}
            error={errMsg}
            required
          />
          <NeonButton type="submit" state={state}>
            {state === "success" ? "메일 발송 완료" : "Magic Link 받기"}
          </NeonButton>
          <p className="px-1 text-[12px] text-muted-foreground">
            받은 메일의 링크를 누르면 즉시 로그인돼요.
          </p>
        </form>
      ) : (
        <form onSubmit={submitPassword} className="mt-5 space-y-4" noValidate>
          <NeonInput
            label="이메일"
            type="email"
            autoComplete="email"
            inputMode="email"
            icon={<MailIcon />}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              reset();
            }}
            required
          />
          <NeonInput
            label="비밀번호"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            icon={<LockIcon />}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              reset();
            }}
            error={errMsg}
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
          <div className="flex items-center justify-end">
            <Link
              to="/reset-password-request"
              className="text-[12px] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>
          <NeonButton type="submit" state={state}>
            {state === "success" ? "로그인 성공" : "로그인"}
          </NeonButton>
        </form>
      )}

      <AuthDivider />
      <p className="text-center text-[12px] leading-relaxed text-muted-foreground">
        계속 진행하면{" "}
        <span className="text-foreground/80">서비스 약관</span>과{" "}
        <span className="text-foreground/80">개인정보 처리방침</span>에 동의하는 것으로 간주됩니다.
      </p>
    </AuthShell>
  );
}
