import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "계정 — Phonara" }, { name: "description", content: "프로필, 보안, 알림 설정." }] }),
  component: () => (
    <AppShell title="계정">
      <div className="px-4 py-4">
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-2 구현 — 로그인, 프로필, 환경설정.</div>
      </div>
    </AppShell>
  ),
});
