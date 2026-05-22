import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

/**
 * Client-side middleware: attaches the current user's Bearer token to every
 * server-fn call. Append to functionMiddleware in src/start.ts.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      return next({ headers: { Authorization: `Bearer ${token}` } });
    }
    return next();
  },
);
