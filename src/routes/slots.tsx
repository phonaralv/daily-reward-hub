import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";

export const Route = createFileRoute("/slots")({
  head: () => ({ meta: [{ title: "슬롯 — Phonara" }, { name: "description", content: "Stake급 슬롯 경험." }] }),
  component: () => (
    <AppShell title="슬롯">
      <div className="px-4 py-4">
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-8 구현 — 슬롯 라이브러리.</div>
      </div>
    </AppShell>
  ),
});
