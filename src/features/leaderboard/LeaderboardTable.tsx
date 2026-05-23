/**
 * LeaderboardTable — read-only top entries for current period.
 * Settlement is performed by `settle_leaderboard()` via cron.
 */
import { useCurrentLeaderboard } from "@/entities/leaderboard";
import { PhonAmount } from "@/shared/ui/PhonAmount";

export function LeaderboardTable() {
  const { data, isLoading } = useCurrentLeaderboard();
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">
        불러오는 중…
      </div>
    );
  }
  if (!data?.periodId) {
    return (
      <div className="rounded-2xl border border-border bg-surface-1 p-4 text-sm text-muted-foreground">
        진행 중인 리더보드가 없어요.
      </div>
    );
  }
  const rows = data.entries ?? [];
  return (
    <div className="rounded-2xl border border-border bg-surface-1 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-baseline justify-between">
        <span className="text-sm font-semibold text-foreground">
          {data.kind === "weekly" ? "주간 리더보드" : "리더보드"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          ~{data.endsAt ? new Date(data.endsAt).toLocaleString("ko-KR") : ""}
        </span>
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground text-center">
          아직 점수가 없어요.
        </div>
      ) : (
        <ul>
          {rows.map((e) => (
            <li
              key={e.userId}
              className="px-4 py-2 border-b border-border last:border-b-0 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-right text-xs text-muted-foreground">
                  {e.rank}
                </span>
                <span className="truncate text-sm text-foreground">
                  {e.displayName ?? `${e.userId.slice(0, 6)}…`}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-muted-foreground">
                  <PhonAmount value={e.score} />
                </span>
                {e.rewardAmount > 0 && (
                  <span className="text-xs font-semibold text-primary">
                    +<PhonAmount value={e.rewardAmount} />
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
