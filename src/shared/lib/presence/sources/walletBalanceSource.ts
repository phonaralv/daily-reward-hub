/**
 * walletBalanceSource — adapts react-query WALLET_QK cache into a
 * PresenceSource so LiveValue/LiveBadge can render the wallet balance
 * without subscribing to react-query directly.
 *
 * PURITY: This module is React-free (Guard #9). It only reads from the
 * shared QueryClient and exposes a subscribe/get API.
 *
 * Updates flow:
 *   ledger_entries INSERT  →  useLedgerStream invalidates WALLET_QK
 *                          →  react-query refetch sets new value
 *                          →  this source emits to subscribers
 */
import type { QueryClient } from "@tanstack/react-query";
import { WALLET_QK } from "@/entities/wallet";

export interface WalletBalanceSnapshot {
  balance: number;
  updatedAt: number;
}

interface WalletRow {
  balance?: number;
  updatedAt?: string;
}

type Listener = (snap: WalletBalanceSnapshot) => void;

export interface WalletBalanceSource {
  key: "wallet-balance";
  get(): WalletBalanceSnapshot;
  subscribe(listener: Listener): () => void;
}

let _shared: WalletBalanceSource | null = null;

function readSnapshot(qc: QueryClient): WalletBalanceSnapshot {
  const row = qc.getQueryData<WalletRow>(WALLET_QK as unknown as readonly unknown[]);
  return {
    balance: Number(row?.balance ?? 0),
    updatedAt: row?.updatedAt ? Date.parse(row.updatedAt) : 0,
  };
}

export function walletBalanceSource(qc: QueryClient): WalletBalanceSource {
  if (_shared) return _shared;
  const listeners = new Set<Listener>();
  let last = readSnapshot(qc);

  const unsubscribeCache = qc.getQueryCache().subscribe((event) => {
    // narrow: only react to WALLET_QK changes
    const key = event.query.queryKey;
    if (!Array.isArray(key) || key[0] !== "wallet" || key[1] !== "me") return;
    const next = readSnapshot(qc);
    if (next.balance === last.balance && next.updatedAt === last.updatedAt) return;
    last = next;
    listeners.forEach((l) => l(next));
  });

  _shared = {
    key: "wallet-balance",
    get: () => last,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          unsubscribeCache();
          _shared = null;
        }
      };
    },
  };
  return _shared;
}

/** test-only */
export function __resetWalletBalanceSource() {
  _shared = null;
}
