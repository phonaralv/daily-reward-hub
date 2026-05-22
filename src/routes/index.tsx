import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/shared/ui/AppShell";
import { LiveOnboardingCounter } from "@/shared/ui/presence/LiveOnboardingCounter";
import { ActiveCountriesIndicator } from "@/shared/ui/presence/ActiveCountriesIndicator";
import { RewardWaveBanner } from "@/shared/ui/presence/RewardWaveBanner";
import { TrendingMissionPulse } from "@/shared/ui/presence/TrendingMissionPulse";
import { RegionHeatBadge } from "@/shared/ui/presence/RegionHeatBadge";
import { WorldActivityMapPlaceholder } from "@/shared/ui/presence/WorldActivityMapPlaceholder";
import { LiveTicker } from "@/shared/ui/presence/primitives/LiveTicker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Phonara — 무료로 시작하는 부수입 플랫폼" },
      { name: "description", content: "0초 진입, 3초 첫 보상, 12초 첫 공유. 무료 부수입 플랫폼." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AppShell title="Phonara">
      <div className="px-4 py-4 space-y-4">
        <section className="flex items-center justify-between">
          <LiveOnboardingCounter />
          <RegionHeatBadge />
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            지금 글로벌 활동
          </h2>
          <WorldActivityMapPlaceholder />
          <ActiveCountriesIndicator />
        </section>

        <RewardWaveBanner />

        <LiveTicker size={5} className="px-1" />

        <TrendingMissionPulse />

        <section className="rounded-2xl border border-border bg-surface-1 p-4">
          <p className="text-xs text-muted-foreground">PR-2 구현 예정 — 출석/미션 위젯, 첫 보상 플로우.</p>
        </section>
      </div>
    </AppShell>
  );
}
