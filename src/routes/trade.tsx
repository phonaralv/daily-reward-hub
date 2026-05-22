import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { LiveTicker } from "@/shared/ui/presence/primitives/LiveTicker";
import { LiveDot } from "@/shared/ui/presence/primitives/LiveDot";

export const Route = createFileRoute("/trade")({
  head: () => ({ meta: [{ title: "트레이드 — Phonara" }, { name: "description", content: "Bybit급 모바일 트레이딩." }] }),
  component: () => (
    <AppShell title="트레이드">
      <div className="px-4 py-4 space-y-3">
        <section className="flex items-center justify-between rounded-2xl border border-border bg-surface-aggregate px-4 py-3">
          <div className="flex items-center gap-2">
            <LiveDot />
            <span className="text-xs text-muted-foreground">지금 트레이딩 중</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">LIVE</span>
        </section>
        <LiveTicker />
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-7 구현 — 차트, 주문, 포지션.</div>
      </div>
    </AppShell>
  ),
});
