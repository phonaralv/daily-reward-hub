/**
 * rewardClaimSource — in-memory 1-record presence source.
 *
 * `useLedgerStream` (root-mounted) calls `pushRewardClaim(...)` whenever
 * a ledger_entries INSERT arrives. Subscribers (e.g. LiveBadge) see the
 * most recent reward for 30 seconds, then fade back to `null`.
 *
 * PURITY: React-free (Guard #9). Pure module state + setTimeout.
 */

export interface RewardClaim {
  kind: string;
  amount: number;
  refKind: string;
  refId: string;
  at: number; // ms epoch
}

type Listener = (current: RewardClaim | null) => void;

const FADE_MS = 30_000;

const listeners = new Set<Listener>();
let current: RewardClaim | null = null;
let fadeTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l(current);
}

export function pushRewardClaim(claim: Omit<RewardClaim, "at"> & { at?: number }) {
  current = { ...claim, at: claim.at ?? Date.now() };
  emit();
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    current = null;
    fadeTimer = null;
    emit();
  }, FADE_MS);
}

export interface RewardClaimSource {
  key: "reward-claim";
  get(): RewardClaim | null;
  subscribe(listener: Listener): () => void;
}

export function rewardClaimSource(): RewardClaimSource {
  return {
    key: "reward-claim",
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** test-only */
export function __resetRewardClaimSource() {
  if (fadeTimer) clearTimeout(fadeTimer);
  fadeTimer = null;
  current = null;
  listeners.clear();
}
