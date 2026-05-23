/**
 * Presence Source Registry — single canonical entry point for every
 * `PresenceSource<T>` shipped by the platform.
 *
 * Consumers (hooks, primitives, telemetry dashboards, debug tooling) MUST
 * import sources and their telemetry keys from this file rather than
 * reaching into individual `sources/*` modules. This keeps the surface
 * frozen and makes PR-2's server-driven source swap a single-file edit.
 */

export type { PresenceSource } from "./types";

export { heatRegionSource } from "./heatRegionSource";
export {
  liveCounterSource,
  type LiveCounterSourceOpts,
} from "./liveCounterSource";
export { tickerSource, type TickerItem } from "./tickerSource";
export { countryCountSource } from "./countryCountSource";
export {
  rewardWaveSource,
  type RewardWaveLevel,
  type RewardWaveState,
} from "./rewardWaveSource";
export {
  trendingMissionSource,
  type MissionPulse,
} from "./trendingMissionSource";
export { onlineDotSource, type OnlineDotState } from "./onlineDotSource";
export {
  worldActivityHeatSource,
  type RegionHeat,
} from "./worldActivityHeatSource";
export {
  walletBalanceSource,
  type WalletBalanceSnapshot,
  type WalletBalanceSource,
} from "./walletBalanceSource";
export {
  rewardClaimSource,
  pushRewardClaim,
  type RewardClaim,
  type RewardClaimSource,
} from "./rewardClaimSource";

/**
 * Canonical telemetry / debug keys for every Presence source.
 *
 * Each value matches the `key` field of the corresponding
 * `PresenceSource<T>` and is used as a stable bucket name in
 * `getTelemetrySnapshot().mutations` and in the dev-only
 * `window.__presenceTelemetry` hook.
 *
 * Conventions:
 *  - Format: `domain:name` (kebab-case) — except the three legacy keys
 *    grandfathered from PR-1 Step 2 (`region-heat`, `live-counter`,
 *    `global-pulse`).
 *  - Suffix with `:variant` for per-instance counters (e.g. the live
 *    counter category suffix is appended at construction time).
 */
export const PRESENCE_SOURCE_KEYS = {
  regionHeat: "region-heat",
  liveCounter: "live-counter",
  globalPulse: "global-pulse",
  ticker: "ticker:global",
  countryCount: "country:count",
  rewardWave: "reward:wave",
  trendingMission: "mission:trending",
  onlineDot: "online:dot",
  worldActivity: "world:activity",
  walletBalance: "wallet-balance",
  rewardClaim: "reward-claim",
} as const;

/**
 * Union of every canonical Presence source key. Use this when typing
 * telemetry consumers, debug overlays, or anywhere a string must be
 * narrowed to a known source bucket.
 */
export type PresenceSourceKey =
  (typeof PRESENCE_SOURCE_KEYS)[keyof typeof PRESENCE_SOURCE_KEYS];
