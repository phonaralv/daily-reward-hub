/**
 * useFingerprint — client-side FingerprintJS loader + server reporter.
 *
 * On mount (browser only), generates a visitorId and POSTs it to the
 * `record_fingerprint` server fn. The server then resolves IP/UA from
 * request headers and stores sha256 hashes. The visitorId itself is not
 * sensitive; IP/UA hashes never leave the server.
 *
 * Mount EXACTLY ONCE at `__root.tsx`.
 */
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { recordFingerprint } from "@/lib/fingerprint.functions";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "phonara:fp:reported";

export function useFingerprint() {
  const report = useServerFn(recordFingerprint);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    (async () => {
      try {
        // Only report once per browser session per signed-in user.
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id;
        if (!userId) return;
        const cached = window.sessionStorage.getItem(SESSION_KEY);
        if (cached === userId) return;

        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (cancelled) return;
        await report({ data: { visitorId: result.visitorId } });
        window.sessionStorage.setItem(SESSION_KEY, userId);
      } catch (err) {
        // Fingerprinting is best-effort. Never break the app.
        console.warn("[fingerprint] skipped:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [report]);
}
