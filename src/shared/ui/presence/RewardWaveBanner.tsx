import { t } from "@/shared/config/i18n";
import { OnlinePulseDot } from "./OnlinePulseDot";

export function RewardWaveBanner() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border"
      style={{ background: "var(--gradient-reward)", boxShadow: "var(--shadow-reward)" }}
    >
      <OnlinePulseDot color="hsl(0 0% 100%)" size={8} />
      <p className="text-sm font-semibold text-background flex-1 truncate">
        {t("presence.reward.waveOpened")}
      </p>
    </div>
  );
}
