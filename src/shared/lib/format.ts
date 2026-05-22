import { useEffect, useRef, useState } from "react";

const KR_COMPACT = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

const KR_FULL = new Intl.NumberFormat("ko-KR");

export const formatPhon = (n: number): string => `${KR_FULL.format(Math.round(n))} PHON`;
export const formatKR = (n: number): string => KR_FULL.format(Math.round(n));
export const formatKRCompact = (n: number): string => KR_COMPACT.format(n);

/**
 * Animated count-up with easing. Respects reduced-motion (jumps instantly).
 */
export function useCountUp(target: number, opts?: { duration?: number; reduced?: boolean }) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (opts?.reduced) {
      setValue(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const duration = opts?.duration ?? 600;
    startRef.current = performance.now();

    const tick = (t: number) => {
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (target - from) * eased;
      setValue(next);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, opts?.duration, opts?.reduced]);

  return value;
}
