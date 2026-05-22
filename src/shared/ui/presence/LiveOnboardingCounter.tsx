import { useLiveCounter } from "@/shared/lib/presence/liveEngine";
import { formatKR } from "@/shared/lib/format";
import { t } from "@/shared/config/i18n";
import { OnlinePulseDot } from "./OnlinePulseDot";

export function LiveOnboardingCounter({ seed = 12431 }: { seed?: number }) {
  const value = useLiveCounter(seed, {
    minDelta: -2,
    maxDelta: 8,
    intervalMs: [2500, 7000],
    waveMs: [40_000, 90_000],
    waveDelta: [10, 35],
    category: "onboarding",
    floor: 1000,
  });
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-1 border border-border">
      <OnlinePulseDot color="var(--success)" size={7} />
      <span className="text-sm text-foreground/90">
        <span data-numeric className="font-tabular font-semibold text-foreground">
          {formatKR(value)}
        </span>{" "}
        <span className="text-muted-foreground text-xs">
          {t("presence.online.now", { count: "" }).replace(" ", "")}
        </span>
      </span>
    </div>
  );
}
