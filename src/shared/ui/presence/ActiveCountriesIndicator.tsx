import { useLiveCounter } from "@/shared/lib/presence/liveEngine";
import { COUNTRY_COUNT } from "@/shared/config/presence/regions";
import { t } from "@/shared/config/i18n";

export function ActiveCountriesIndicator() {
  const value = useLiveCounter(COUNTRY_COUNT, {
    minDelta: -1,
    maxDelta: 1,
    intervalMs: [8000, 18_000],
    waveMs: [60_000, 120_000],
    waveDelta: [1, 2],
    floor: 30,
    easeMs: 400,
  });
  const intValue = Math.round(value);
  return (
    <span
      data-presence="countries"
      data-value={intValue}
      className="text-xs text-muted-foreground"
      data-numeric
    >
      <span data-presence-text>
        🌐 {t("presence.countries.joining", { count: intValue })}
      </span>
    </span>
  );
}
