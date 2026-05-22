// Locale + KST helpers
export const DEFAULT_LOCALE = "ko-KR" as const;
export const DEFAULT_TZ = "Asia/Seoul" as const;

/** Returns hour (0–23) in given timezone. */
export function hourInTz(tz: string, now: Date = new Date()): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });
  return Number(fmt.format(now));
}

export const krDateFmt = new Intl.DateTimeFormat("ko-KR", {
  timeZone: DEFAULT_TZ,
  dateStyle: "medium",
  timeStyle: "short",
});
