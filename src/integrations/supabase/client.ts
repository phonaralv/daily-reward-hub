import { createClient } from "@supabase/supabase-js";

// Placeholder Database type. Replace in PR-2 via supabase gen types typescript.
type Database = Record<string, never>;

// External Supabase ref: edlhlbwojgdnpdjhorpb
// URL is publishable. Anon key must be provided via VITE_SUPABASE_ANON_KEY
// (Lovable env injection) or .env. See README.
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://edlhlbwojgdnpdjhorpb.supabase.co";

// Dummy fallback prevents `createClient` from throwing "supabaseKey is required"
// when the real anon key is not yet wired (e.g. Lovable preview without .env).
// Auth/Realtime/DB calls fail with 401, but the app shell still renders.
const DUMMY_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.phonara-placeholder.placeholder";
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DUMMY_KEY;

if (SUPABASE_ANON_KEY === DUMMY_KEY && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "[phonara] VITE_SUPABASE_ANON_KEY missing — using placeholder. Set it in .env to enable auth/DB.",
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
