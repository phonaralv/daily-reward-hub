import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// External Supabase ref: edlhlbwojgdnpdjhorpb
// URL is publishable. Anon key must be provided via VITE_SUPABASE_ANON_KEY
// (Lovable env injection) or .env. See README.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://edlhlbwojgdnpdjhorpb.supabase.co";

const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

if (!SUPABASE_ANON_KEY && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[phonara] VITE_SUPABASE_ANON_KEY missing. Auth/Realtime/DB calls will fail until set in .env.",
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: "phonara.auth",
  },
});
