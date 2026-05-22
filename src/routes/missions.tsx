import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { TrendingMissionPulse } from "@/shared/ui/presence/TrendingMissionPulse";

export const Route = createFileRoute("/missions")({
  head: () => ({ meta: [{ title: "미션 — Phonara" }, { name: "description", content: "오늘의 미션과 글로벌 트렌드." }] }),
  component: () => (
    <AppShell title="미션">
      <div className="px-4 py-4 space-y-3">
        <TrendingMissionPulse />
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-2 구현 — 일일/주간 미션, 보상 클레임.</div>
      </div>
    </AppShell>
  ),
});
