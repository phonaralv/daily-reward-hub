import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { LiveValue } from "@/shared/ui/presence/primitives/LiveValue";

export const Route = createFileRoute("/refer")({
  head: () => ({ meta: [{ title: "친구 추천 — Phonara" }, { name: "description", content: "친구를 초대하고 보상을 받으세요." }] }),
  component: () => (
    <AppShell title="친구 추천">
      <div className="px-4 py-4 space-y-3">
        <div className="rounded-2xl border border-border bg-surface-1 p-4 flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">전체 추천 체인</span>
          <LiveValue
            seed={9_870}
            className="text-2xl font-semibold text-foreground"
            label="전체 추천 체인 수"
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-6 구현 — 추천 코드, QR, 리워드.</div>
      </div>
    </AppShell>
  ),
});
