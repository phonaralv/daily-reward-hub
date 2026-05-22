/**
 * Single rAF presence scheduler.
 *
 * Step 1 of PR-1: every presence hook (counter, region, pulse) calls
 * `subscribeTick` and runs its own state machine inside the tick callback.
 * The module guarantees:
 *
 *   - exactly ONE active requestAnimationFrame loop while >=1 subscriber exists
 *   - exactly ONE document `visibilitychange` listener
 *   - zero side effects at module load (SSR-safe)
 *   - hidden tab => no tick callbacks fire (Aliveness §No Lockstep + battery)
 *   - HMR-safe: on module dispose the rAF + listener are torn down
 *
 * Contract: subscribers MUST NOT call setInterval/setTimeout themselves.
 * All timing is derived from the `now` argument (performance.now()).
 */

export type PresenceTick = (now: number) => void;

import { recordTick } from "./telemetry";

const ticks = new Set<PresenceTick>();
let rafId: number | null = null;
let visListener: (() => void) | null = null;

function loop(now: number): void {
  if (typeof document === "undefined" || document.visibilityState === "visible") {
    const start = typeof performance !== "undefined" ? performance.now() : now;
    // Snapshot to allow subscribers to unsubscribe during iteration.
    const snapshot = Array.from(ticks);
    for (const fn of snapshot) {
      try {
        fn(now);
      } catch (err) {
        // A misbehaving subscriber must not break the loop for others.
        // Surface in dev only — silent in prod to avoid console noise.
        if (import.meta.env?.DEV) {
          // eslint-disable-next-line no-console
          console.error("[presence/scheduler] tick threw", err);
        }
      }
    }
    if (snapshot.length > 0) {
      const end = typeof performance !== "undefined" ? performance.now() : now;
      recordTick(end - start);
    }
  }
  rafId = requestAnimationFrame(loop);
}

function teardown(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (visListener) {
    document.removeEventListener("visibilitychange", visListener);
    visListener = null;
  }
}

/**
 * Register a tick callback. Returns an unsubscribe function.
 * No-op on the server (returns a noop cleanup) so SSR stays pure.
 */
export function subscribeTick(fn: PresenceTick): () => void {
  if (typeof window === "undefined") return () => {};

  ticks.add(fn);

  if (rafId === null) {
    // visibilitychange is consulted directly inside `loop`. The listener
    // exists only so we can drop it cleanly on teardown and so other code
    // can rely on the contract that exactly one listener exists while
    // the scheduler is active.
    visListener = () => {};
    document.addEventListener("visibilitychange", visListener);
    rafId = requestAnimationFrame(loop);
  }

  return () => {
    ticks.delete(fn);
    if (ticks.size === 0) teardown();
  };
}

/** Test-only: snapshot of current subscriber count. */
export function __getPresenceTickCount(): number {
  return ticks.size;
}

/** Test-only: force teardown (resets module state between tests). */
export function __resetPresenceScheduler(): void {
  ticks.clear();
  teardown();
}

// HMR safety: tear down the rAF + listener owned by the previous module
// instance before the new one takes over. Dev-only; tree-shaken in prod.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ticks.clear();
    teardown();
  });
}
