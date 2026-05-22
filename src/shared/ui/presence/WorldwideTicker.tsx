import { useMemo } from "react";
import { useActiveRegions } from "@/shared/lib/presence/waveEngine";
import { t } from "@/shared/config/i18n";
import { OnlinePulseDot } from "./OnlinePulseDot";

/**
 * Marquee ticker — rotating region/reward/mission/global messages.
 * Single GPU transform animation (defined in styles.css).
 */
export function WorldwideTicker() {
  const regions = useActiveRegions(4);

  const messages = useMemo(() => {
    const items: { id: string; text: string; color: string }[] = [];
    regions.forEach((r) => {
      items.push({
        id: `r-${r.id}`,
        text: t("presence.region.active", { cityKo: `${r.name} · ${r.nameKo}` }),
        color: "var(--reward-glow)",
      });
    });
    items.push({ id: "rw", text: t("presence.reward.waveOpened"), color: "var(--accent-pink)" });
    items.push({ id: "ms", text: t("presence.mission.tonightSurge"), color: "var(--accent-cyan)" });
    items.push({ id: "sk", text: t("presence.streak.surge"), color: "var(--success)" });
    items.push({ id: "gs", text: t("presence.global.spike"), color: "var(--primary-glow)" });
    return items;
  }, [regions]);

  return (
    <div
      className="overflow-hidden border-y border-border bg-surface-1/60"
      style={{ contentVisibility: "auto" }}
    >
      <div className="phonara-marquee py-2">
        {[...messages, ...messages].map((m, i) => (
          <span
            key={`${m.id}-${i}`}
            className="inline-flex items-center gap-2 px-5 text-xs font-medium whitespace-nowrap text-foreground/90"
          >
            <OnlinePulseDot color={m.color} size={6} />
            {m.text}
          </span>
        ))}
      </div>
    </div>
  );
}
