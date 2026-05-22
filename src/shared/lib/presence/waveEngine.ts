import { useEffect, useState } from "react";
import { REGIONS, type Region } from "@/shared/config/presence/regions";
import { hourInTz } from "@/shared/config/locale";

/**
 * Compute the current "heat" score for a region based on its local prime hours.
 * 0 = quiet, 1+ = active. Pure function — safe in SSR.
 */
export function regionHeat(r: Region, now: Date = new Date()): number {
  const h = hourInTz(r.timezone, now);
  const [start, end] = r.activeHours;
  const inPrime = h >= start && h <= end;
  const base = 0.5 + Math.sin((h / 24) * Math.PI * 2) * 0.15;
  return inPrime ? base * r.activityMultiplier + 0.4 : base * 0.6;
}

/** Region rotation: returns the N hottest regions right now. */
export function useActiveRegions(count: number = 4): Region[] {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 45_000);
    return () => clearInterval(id);
  }, []);
  return [...REGIONS]
    .map((r) => ({ r, score: regionHeat(r) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ r }) => r);
}

/** Time-bucket multipliers for different content types. */
export function getTimeMultiplier(category: "onboarding" | "trade" | "reward" | "activity"): number {
  const seoulH = hourInTz("Asia/Seoul");
  const nyH = hourInTz("America/New_York");
  const lonH = hourInTz("Europe/London");

  const asiaPrime = seoulH >= 19 && seoulH <= 23;
  const naEvening = nyH >= 19 && nyH <= 23;
  const euLunch = lonH >= 12 && lonH <= 14;
  const krDawn = seoulH >= 2 && seoulH <= 6;

  if (krDawn) return 0.55;
  if (category === "onboarding" || category === "activity") return asiaPrime ? 1.45 : 1.0;
  if (category === "trade" || category === "reward") return naEvening ? 1.4 : euLunch ? 1.2 : 1.0;
  return 1.0;
}
