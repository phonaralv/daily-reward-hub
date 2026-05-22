import { useEffect, useState } from "react";

/**
 * Visual viewport tracker — fixes iOS Safari keyboard cover bugs.
 * Returns { height, offsetTop } of the visible viewport.
 */
export function useVisualViewport() {
  const [vp, setVp] = useState({
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    offsetTop: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVp({ height: vv.height, offsetTop: vv.offsetTop });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return vp;
}
