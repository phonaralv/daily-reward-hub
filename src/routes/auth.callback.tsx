/**
 * /auth/callback — Magic Link / OAuth 콜백 처리.
 * supabase-js가 URL hash를 자동 처리하므로, 세션 등장까지 짧게 폴링한 뒤 home으로 이동.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell } from "@/features/auth/ui/AuthShell";
import { NeonButton } from "@/features/auth/ui/NeonButton";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "로그인 중 — PHONARA" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "fail">("working");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = new URL(window.location.href);
    const hashErr = new URLSearchParams(window.location.hash.slice(1)).get(
      "error_description",
    );
    const qErr = url.searchParams.get("error_description");
    const initialErr = hashErr || qErr;

    if (initialErr) {
      setErrMsg(decodeURIComponent(initialErr));
      setStatus("fail");
      return;
    }

    // supabase.auth picks up the URL hash automatically; poll for session.
    let tries = 0;
    const tick = async () => {
      tries += 1;
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.user) {
        setStatus("ok");
        setTimeout(() => navigate({ to: "/" }), 350);
        return;
      }
      if (tries >= 20) {
        setErrMsg("세션을 확인할 수 없어요. 다시 로그인해주세요.");
        setStatus("fail");
        return;
      }
      setTimeout(tick, 150);
    };
    tick();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (status === "fail") {
    return (
      <AuthShell
        eyebrow="로그인 실패"
        title="세션을 확인할 수 없어요"
        subtitle={errMsg ?? "링크가 만료되었거나 이미 사용되었어요."}
        footer={
          <Link to="/login" className="font-medium text-foreground hover:underline">
            로그인으로 돌아가기
          </Link>
        }
      >
        <NeonButton variant="secondary" onClick={() => navigate({ to: "/login" })}>
          다시 시도
        </NeonButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="잠시만요"
      title={status === "ok" ? "환영합니다" : "로그인 중…"}
      subtitle={
        status === "ok"
          ? "곧 홈으로 이동합니다."
          : "Magic Link를 검증하고 있어요. 잠시만 기다려주세요."
      }
    >
      <div className="flex items-center justify-center py-4">
        <span
          aria-hidden
          className="inline-block h-8 w-8 rounded-full border-2 border-white/15 border-t-[color:var(--auth-glow-cyan)]"
          style={{ animation: "auth-spin 0.8s linear infinite" }}
        />
      </div>
    </AuthShell>
  );
}
