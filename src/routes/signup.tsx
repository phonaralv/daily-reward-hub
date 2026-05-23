/**
 * /signup — Magic Link 또는 이메일+비밀번호 회원가입.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthShell } from "@/features/auth/ui/AuthShell";
import { AuthTabs } from "@/features/auth/ui/AuthTabs";
import { NeonInput } from "@/features/auth/ui/NeonInput";
import { NeonButton } from "@/features/auth/ui/NeonButton";
import {
  PasswordStrengthMeter,
  scorePassword,
} from "@/features/auth/ui/PasswordStrengthMeter";
import { sendMagicLink, signUpWithPassword } from "@/features/auth/auth";
import { useAuth } from "@/features/auth/useAuth";
import { notify } from "@/shared/lib/notify";

type Mode = "magic" | "password";
type BtnState = "idle" | "loading" | "success" | "error";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "회원가입 — PHONARA" },
      {
        name: "description",
        content: "PHONARA에 가입하고 무료로 부수입을 시작하세요.",
      },
    ],
  }),
  component: SignupPage,
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

function SignupPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [state, setState] = useState<BtnState>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate({ to: "/" });
  }, [authLoading, isAuthenticated, navigate]);

  const strength = useMemo(
    () => scorePassword(password, { email }),
    [password, email],
  );

  const reset = () => {
    setErrMsg(null);
    if (state !== "loading") setState("idle");
  };

  const submitMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrMsg("이메일을 입력해주세요.");
      setState("error");
      return;
    }
    if (!agree) {
      setErrMsg("약관에 동의해주세요.");
      setState("error");
      return;
    }
    setState("loading");
    const { error } = await sendMagicLink(email);
    if (error) {
      setErrMsg(error.message);
      setState("error");
      return;
    }
    setSentTo(email);
    setState("success");
    notify.success("가입 링크를 보냈어요", {
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
    if (!agree) {
      setErrMsg("약관에 동의해주세요.");
      setState("error");
      return;
    }
    if (strength.score < 2) {
      setErrMsg("비밀번호가 너무 약합니다. 12자 이상, 여러 문자 종류를 섞어주세요.");
      setState("error");
      return;
    }
    setState("loading");
    const { error } = await signUpWithPassword({ email, password });
    if (error) {
      setErrMsg(error.message);
      setState("error");
      notify.error("회원가입 실패", { description: error.message });
      return;
    }
    setSentTo(email);
    setState("success");
    notify.success("가입 확인 메일을 보냈어요", {
      description: `${email} 메일함을 확인해주세요.`,
    });
  };

  if (sentTo) {
    return (
      <AuthShell
        eyebrow="이메일 확인"
        title="메일함을 확인해주세요"
        subtitle={
          <>
            <span className="text-foreground">{sentTo}</span>으로 인증 메일을 보냈어요.
            메일 안의 링크를 누르면 가입이 완료됩니다.
          </>
        }
        footer={
          <Link to="/login" className="font-medium text-foreground hover:underline">
            로그인으로 돌아가기
          </Link>
        }
      >
        <NeonButton
          variant="secondary"
          onClick={() => {
            setSentTo(null);
            setState("idle");
          }}
        >
          다른 이메일로 다시 시도
        </NeonButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="첫 보상까지 3초"
      title={
        <>
          <span
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(45 100% 62%), hsl(20 95% 60%))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            PHONARA
          </span>{" "}
          가입하기
        </>
      }
      subtitle="신용카드 없이, 0초 만에 시작합니다."
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link to="/login" className="font-medium text-foreground hover:underline underline-offset-4">
            로그인
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
            inputMode="email"
            autoComplete="email"
            icon={<MailIcon />}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              reset();
            }}
            error={errMsg}
            required
          />
          <AgreeBox value={agree} onChange={setAgree} />
          <NeonButton type="submit" state={state}>
            {state === "success" ? "메일 발송 완료" : "가입 링크 받기"}
          </NeonButton>
        </form>
      ) : (
        <form onSubmit={submitPassword} className="mt-5 space-y-4" noValidate>
          <NeonInput
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            icon={<MailIcon />}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              reset();
            }}
            required
          />
          <div>
            <NeonInput
              label="비밀번호"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
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
            <PasswordStrengthMeter password={password} email={email} />
          </div>
          <AgreeBox value={agree} onChange={setAgree} />
          <NeonButton type="submit" state={state}>
            {state === "success" ? "메일 발송 완료" : "계정 만들기"}
          </NeonButton>
        </form>
      )}
    </AuthShell>
  );
}

function AgreeBox({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[12.5px] leading-relaxed text-muted-foreground transition hover:border-white/15">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-[color:var(--auth-glow-purple)]"
      />
      <span>
        <span className="text-foreground/90">서비스 약관</span> 및{" "}
        <span className="text-foreground/90">개인정보 처리방침</span>에 동의합니다.
        (필수)
      </span>
    </label>
  );
}
