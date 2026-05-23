/**
 * StreakDots — 7-dot progress strip for daily-reward streak.
 *
 * Presentation only. Data comes from `useStreak()` which reads from the
 * `streaks` table (single source of truth, mutated only by
 * `claim_daily_reward()` RPC).
 */
import { useStreak } from "@/entities/streak";

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function StreakDots() {
  const { data } = useStreak();
  const current = data?.currentDay ?? 0;
  return (
    <div className="flex items-center gap-1.5" aria-label={`현재 ${current}일차 / 7일`}>
      {DAYS.map((d) => {
        const isReached = d <= current;
        const isToday = d === current;
        return (
          <span
            key={d}
            className={[
              "h-2 w-6 rounded-full transition-colors",
              isReached ? "bg-primary" : "bg-surface-3",
              isToday ? "ring-2 ring-primary-glow ring-offset-2 ring-offset-surface-1" : "",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}
