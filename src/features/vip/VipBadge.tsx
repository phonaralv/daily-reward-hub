/**
 * VipBadge — purely presentational. Reads server-computed tier + multiplier.
 * Never re-derives multiplier (Guard #13).
 */
import { useMyVip } from "@/entities/vip";
import { PhonAmount } from "@/shared/ui/PhonAmount";

export function VipBadge() {
  const { data } = useMyVip();
  const tier = data?.tier ?? 0;
  const mult = data?.multiplier ?? 1;
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-4 flex items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">VIP</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          Tier {tier}
        </p>
        <p className="text-xs text-muted-foreground">
          30일 누적 +<PhonAmount value={data?.amount30d ?? 0} /> PHON
        </p>
      </div>
      <div className="text-right">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          보상 배율
        </p>
        <p className="text-xl font-semibold text-primary">×{mult.toFixed(2)}</p>
      </div>
    </div>
  );
}
