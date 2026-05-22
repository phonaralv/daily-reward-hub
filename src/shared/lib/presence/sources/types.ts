/**
 * PresenceSource — single contract for "what value does this presence
 * element show at time T?".
 *
 * Step 2 (PR-1): hooks no longer compute presence values directly. Each
 * hook owns a `PresenceSource<T>` and the shared `useSource(...)` driver
 * reads from it on every rAF tick.
 *
 * Contract:
 *  - `firstPaint()` MUST be pure. Same input → same output on Node, Workerd
 *    and Chromium V8. Used for both SSR and the first 1000ms of CSR.
 *  - `sample(now, prev)` returns the next value. If the value has not
 *    meaningfully changed, return `prev` BY REFERENCE so the driver can
 *    skip the React state update (no re-render, no mutation telemetry).
 *  - `minIntervalMs` is the driver's gate — `sample` will not be invoked
 *    again before this many ms have elapsed since the last invocation.
 *    A source may set `0` if it produces smooth per-frame interpolation
 *    and uses internal timers to gate real value changes.
 *  - `key` is a stable kebab-case identifier used for telemetry buckets
 *    and debugging. Suffix with `:variant` for multiple instances.
 */
export interface PresenceSource<T> {
  readonly key: string;
  firstPaint(): T;
  sample(now: number, prev: T): T;
  readonly minIntervalMs: number;
}
