import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { LiveBadge } from "@/shared/ui/presence/primitives/LiveBadge";
import { LiveValue } from "@/shared/ui/presence/primitives/LiveValue";

export const Route = createFileRoute("/slots")({
  head: () => ({ meta: [{ title: "슬롯 — Phonara" }, { name: "description", content: "Stake급 슬롯 경험." }] }),
  component: () => (
    <AppShell title="슬롯">
      <div className="px-4 py-4 space-y-3">
        <section className="flex items-center justify-between rounded-2xl border border-border bg-surface-aggregate px-4 py-3">
          <div className="flex items-center gap-2">
            <LiveBadge />
            <span className="text-xs text-muted-foreground">현재 보상 흐름</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">SPINS / 24H</p>
            <LiveValue
              seed={12_840}
              opts={{ category: "reward" }}
              className="text-sm font-bold text-foreground"
            />
          </div>
        </section>
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-8 구현 — 슬롯 라이브러리.</div>
      </div>
    </AppShell>
  ),
});
