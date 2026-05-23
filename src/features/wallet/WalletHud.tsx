/**
 * WalletHud — current balance + recent ledger entries (read-only).
 *
 * Reads from `wallets` and `ledger_entries` via server fns. Realtime
 * invalidation lands through `useLedgerStream` mounted at __root.
 */
import { useWallet } from "@/entities/wallet";
import { useLedger, type LedgerKind } from "@/entities/ledger";
import { PhonAmount } from "@/shared/ui/PhonAmount";

const KIND_LABEL: Record<LedgerKind, string> = {
  daily_reward: "데일리 보상",
  quest_reward: "퀘스트 보상",
  adjustment: "조정",
  spend: "사용",
};

export function WalletHud() {
  const wallet = useWallet();
  const ledger = useLedger(10);
  const balance = wallet.data?.balance ?? 0;

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-border bg-surface-1 p-6">
        <p className="text-xs text-muted-foreground">현재 잔고</p>
        <p className="mt-1 text-3xl font-bold">
          <PhonAmount value={balance} />
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-surface-1 p-4">
        <h4 className="text-xs font-semibold text-muted-foreground">최근 활동</h4>
        <ul className="mt-3 space-y-2">
          {ledger.isLoading && (
            <li className="text-xs text-muted-foreground">불러오는 중...</li>
          )}
          {!ledger.isLoading && (ledger.data?.length ?? 0) === 0 && (
            <li className="text-xs text-muted-foreground">아직 활동이 없어요.</li>
          )}
          {ledger.data?.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-foreground">{KIND_LABEL[e.kind as LedgerKind]}</span>
              <span
                className={
                  e.amount >= 0 ? "font-semibold text-success" : "font-semibold text-danger"
                }
              >
                {e.amount >= 0 ? "+" : ""}
                <PhonAmount value={e.amount} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
