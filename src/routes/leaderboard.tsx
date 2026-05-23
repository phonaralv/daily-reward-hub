import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { LeaderboardTable } from "@/features/leaderboard/LeaderboardTable";
import { VipBadge } from "@/features/vip/VipBadge";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "리더보드 — Phonara" },
      { name: "description", content: "이번 주 상위 랭커와 보상." },
    ],
  }),
  component: () => (
    <AppShell title="리더보드">
      <div className="px-4 py-4 space-y-3">
        <VipBadge />
        <LeaderboardTable />
      </div>
    </AppShell>
  ),
});
