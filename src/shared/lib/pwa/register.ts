/**
 * PWA service-worker registration with iframe/preview guard.
 * SW is registered ONLY in production on non-preview hosts.
 * In Lovable preview/iframe, any existing SW is auto-unregistered + caches purged.
 */
export function registerPwa(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovable.app");
  const isDev = import.meta.env.DEV;

  if (inIframe || isPreviewHost || isDev) {
    // Cleanup any previously registered SW + caches
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    return;
  }

  // Production-only registration. SW file is shipped separately in PR-2+.
  // For PR-1 foundation we keep this hook but don't register a SW yet.
  // (vite-plugin-pwa wiring is deferred — see plan.)
}
