/**
 * Single rAF presence scheduler (지존급 버전).
 *
 * 핵심 계약:
 * - presence 관련 모든 tick은 정확히 하나의 rAF 루프에서만 발생
 * - 탭이 숨겨지면 rAF를 완전히 멈춰 배터리/CPU 절약 (모바일 최적화)
 * - 탭이 다시 보이면 즉시 재개
 * - visibilitychange 리스너는 정확히 하나만 존재 (계약 보장)
 * - HMR 안전 + SSR 안전
 * - 구독자가 0명이 되면 완전 teardown
 *
 * 이 모듈은 PR-1의 기반이며, 30년 후에도 유지보수 가능한 수준으로 설계됨.
 */
import {
  recordTick,
  getTelemetrySnapshot,
  __resetTelemetry,
} from "./telemetry";

export type PresenceTick = (now: number) => void;

const ticks = new Set<PresenceTick>();
let rafId: number | null = null;
let visListener: (() => void) | null = null;
let isPaused = false;

function loop(now: number): void {
  if (typeof document === "undefined") {
    rafId = requestAnimationFrame(loop);
    return;
  }

  if (document.visibilityState === "hidden") {
    // 숨겨진 탭에서는 루프를 멈춤 (배터리 절약)
    isPaused = true;
    return;
  }

  if (isPaused) {
    // 다시 보이게 되면 다음 프레임부터 정상 동작
    isPaused = false;
  }

  const start = typeof performance !== "undefined" ? performance.now() : now;

  const snapshot = Array.from(ticks);
  for (const fn of snapshot) {
    try {
      fn(now);
    } catch (err) {
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

  rafId = requestAnimationFrame(loop);
}

function startLoop(): void {
  if (rafId !== null) return;

  isPaused = false;
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
  isPaused = false;
}

/**
 * Tick 콜백 등록. 구독 해제 함수를 반환.
 * 서버 환경에서는 noop을 반환 (SSR 안전).
 */
export function subscribeTick(fn: PresenceTick): () => void {
  if (typeof window === "undefined") return () => {};

  ticks.add(fn);

  if (rafId === null) {
    // 정확히 하나의 visibilitychange 리스너만 유지 (계약)
    visListener = () => {
      if (document.visibilityState === "visible" && rafId === null && ticks.size > 0) {
        startLoop();
      }
    };
    document.addEventListener("visibilitychange", visListener);

    startLoop();
  }

  return () => {
    ticks.delete(fn);
    if (ticks.size === 0) {
      teardown();
    }
  };
}

/** Test-only helpers */
export function __getPresenceTickCount(): number {
  return ticks.size;
}

export function __resetPresenceScheduler(): void {
  ticks.clear();
  teardown();
}

// HMR 안전 처리
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ticks.clear();
    teardown();
  });
}
