import { stablePresenceHash, PRESENCE_FIRST_PAINT_SEED } from "../waveEngine";
import type { PresenceSource } from "./types";

export type RewardWaveLevel = "calm" | "rising" | "surge";

export interface RewardWaveState {
  readonly level: RewardWaveLevel;
  /** 0..1 normalized intensity within the current level. */
  readonly intensity: number;
}

const FIRST_PAINT: RewardWaveState = Object.freeze({
  level: "calm",
  intensity: 0,
});

/**
 * `minIntervalMs = 300` rationale:
 *  - The wave eases continuously, so the driver must sample frequently
 *    enough to render a smooth intensity ramp.
 *  - But unlike the counter (which needs every rAF frame), the wave is a
 *    low-frequency aesthetic signal — 300ms keeps perceptual smoothness
 *    while bounding mutation telemetry to a predictable rate (≤~3/sec).
 *
 * Reference identity:
 *  - `sample` builds the next state only when (level, quantized intensity)
 *    actually differs from `prev`. When the eased intensity rounds to the
 *    same step we already emitted, we return `prev` verbatim — no new
 *    object, no React re-render, no spurious telemetry mutation.
 */
const REFRESH_MS = 300;
const PHASE_MS = 18_000; // calm → rising → surge cycle period
const INTENSITY_STEPS = 20; // quantize ease to 20 steps → max 1 mutation / ~150ms

function phaseFor(now: number): RewardWaveLevel {
  const p = (now % PHASE_MS) / PHASE_MS;
  if (p < 0.55) return "calm";
  if (p < 0.85) return "rising";
  return "surge";
}

function rawIntensity(now: number, seed: string): number {
  const t = (now % PHASE_MS) / PHASE_MS;
  const h = stablePresenceHash(`${seed}:wave:${Math.floor(now / PHASE_MS)}`);
  const jitter = ((h % 100) / 100) * 0.1; // 0..0.1 deterministic per cycle
  // Smooth triangular ease; 0 at boundary, ~1 at mid-phase.
  const tri = 1 - Math.abs(2 * t - 1);
  return Math.min(1, tri + jitter);
}

export function rewardWaveSource(
  seed: string = PRESENCE_FIRST_PAINT_SEED,
): PresenceSource<RewardWaveState> {
  return {
    key: "reward:wave",
    minIntervalMs: REFRESH_MS,
    firstPaint: () => FIRST_PAINT,
    sample: (now, prev) => {
      const level = phaseFor(now);
      const quant = Math.round(rawIntensity(now, seed) * INTENSITY_STEPS) /
        INTENSITY_STEPS;
      if (level === prev.level && quant === prev.intensity) {
        return prev;
      }
      return { level, intensity: quant };
    },
  };
}
