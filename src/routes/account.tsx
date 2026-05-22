import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { LiveDot } from "@/shared/ui/presence/primitives/LiveDot";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "계정 — Phonara" }, { name: "description", content: "프로필, 보안, 알림 설정." }] }),
  component: () => (
    <AppShell title="계정">
      <div className="px-4 py-4 space-y-3">
        <div className="rounded-2xl border border-border bg-surface-1 p-4 flex items-center gap-2 text-xs text-muted-foreground">
          <LiveDot />
          <span>세션 활성</span>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-2 구현 — 로그인, 프로필, 환경설정.</div>
      </div>
    </AppShell>
  ),
});
