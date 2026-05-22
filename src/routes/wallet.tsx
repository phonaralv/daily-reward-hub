import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { PhonAmount } from "@/shared/ui/PhonAmount";
import { LiveDot } from "@/shared/ui/presence/primitives/LiveDot";
import { LiveValue } from "@/shared/ui/presence/primitives/LiveValue";

export const Route = createFileRoute("/wallet")({
  head: () => ({ meta: [{ title: "지갑 — Phonara" }, { name: "description", content: "PHON 잔고와 입출금." }] }),
  component: () => (
    <AppShell title="지갑">
      <div className="px-4 py-4 space-y-3">
        <div className="rounded-2xl border border-border bg-surface-1 p-6">
          <p className="text-xs text-muted-foreground">잔고</p>
          <p className="mt-1 text-3xl font-bold"><PhonAmount value={0} /></p>
        </div>
        <section className="flex items-center justify-between rounded-2xl border border-border bg-surface-aggregate px-4 py-3">
          <div className="flex items-center gap-2">
            <LiveDot />
            <span className="text-xs text-muted-foreground">글로벌 활동량</span>
          </div>
          <LiveValue
            seed={48_320}
            opts={{ category: "activity" }}
            className="text-sm font-bold text-foreground"
          />
        </section>
        <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">PR-5 구현 — 입출금, 거래내역, QR.</div>
      </div>
    </AppShell>
  ),
});
