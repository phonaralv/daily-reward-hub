import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { LiveOnboardingCounter } from "@/shared/ui/presence/LiveOnboardingCounter";
import { LiveBadge } from "@/shared/ui/presence/primitives/LiveBadge";

export const Route = createFileRoute("/play-free")({
  head: () => ({ meta: [{ title: "무료 플레이 — Phonara" }, { name: "description", content: "무료로 즐기는 미니게임 + 즉시 보상." }] }),
  component: () => (
    <AppShell title="무료 플레이">
      <div className="px-4 py-4 space-y-3">
        <section className="flex items-center justify-between rounded-2xl border border-border bg-surface-aggregate px-4 py-3">
          <LiveOnboardingCounter seed={8421} />
          <LiveBadge />
        </section>
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-4 구현 — 무료 미니게임, 즉시 보상.</div>
      </div>
    </AppShell>
  ),
});
