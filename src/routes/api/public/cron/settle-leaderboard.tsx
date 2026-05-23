/**
 * /api/public/cron/settle-leaderboard
 *
 * Called by an external scheduler (pg_cron, GitHub Actions, etc.) to
 * settle ALL expired but unsettled leaderboard periods. Settlement is
 * delegated to the SECURITY DEFINER RPC `settle_leaderboard(period_id)`
 * which:
 *   1. Takes an advisory xact lock per period (idempotent re-runs safe).
 *   2. Ranks entries by score DESC.
 *   3. Credits the top 10 via `_apply_reward()` (single entry point).
 *
 * Security: HMAC-SHA256 over the raw body using `CRON_SECRET`. Without
 * a valid signature header the route 401s and writes nothing.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/cron/settle-leaderboard")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) {
          return new Response("Server misconfigured", { status: 500 });
        }
        const sigHeader = request.headers.get("x-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        let ok = false;
        try {
          const a = Buffer.from(sigHeader, "hex");
          const b = Buffer.from(expected, "hex");
          ok = a.length === b.length && timingSafeEqual(a, b);
        } catch {
          ok = false;
        }
        if (!ok) return new Response("Invalid signature", { status: 401 });

        const now = new Date().toISOString();
        const { data: periods, error: pErr } = await supabaseAdmin
          .from("leaderboard_periods")
          .select("id")
          .lte("ends_at", now)
          .is("settled_at", null)
          .limit(20);
        if (pErr) return new Response(pErr.message, { status: 500 });

        let totalPaid = 0;
        const settled: string[] = [];
        for (const p of periods ?? []) {
          const { data, error } = await supabaseAdmin.rpc("settle_leaderboard", {
            p_period_id: p.id,
          });
          if (error) {
            return new Response(`settle_leaderboard ${p.id}: ${error.message}`, {
              status: 500,
            });
          }
          totalPaid += Number(data ?? 0);
          settled.push(p.id);
        }

        return new Response(
          JSON.stringify({ settled, payouts: totalPaid }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
