import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";

export const Route = createFileRoute("/trade")({
  head: () => ({ meta: [{ title: "트레이드 — Phonara" }, { name: "description", content: "Bybit급 모바일 트레이딩." }] }),
  component: () => (
    <AppShell title="트레이드">
      <div className="px-4 py-4">
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-7 구현 — 차트, 주문, 포지션.</div>
      </div>
    </AppShell>
  ),
});
