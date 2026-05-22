import { t } from "@/shared/config/i18n";
import { OnlinePulseDot } from "./OnlinePulseDot";

export function TrendingMissionPulse() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-1 border border-border">
      <OnlinePulseDot color="var(--accent-cyan)" size={7} />
      <span className="text-xs text-foreground/90">{t("presence.mission.tonightSurge")}</span>
    </div>
  );
}
