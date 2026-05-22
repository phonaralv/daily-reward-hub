import { useReducedMotion } from "framer-motion";

/** Returns true if user prefers reduced motion. SSR-safe. */
export function useReducedMotionSafe(): boolean {
  const reduced = useReducedMotion();
  return Boolean(reduced);
}
