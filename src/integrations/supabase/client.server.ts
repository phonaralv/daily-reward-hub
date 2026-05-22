// SERVER-ONLY. Never import from client/component code.
// CI guard (scripts/guards.sh) enforces zero client imports of this file.
import { createClient } from "@supabase/supabase-js";
type Database = Record<string, never>;

const url = process.env.SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseAdmin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
