/**
 * Fingerprint server function — server-side IP/UA hashing.
 *
 * Client sends only the FingerprintJS `visitorId` (string). The server
 * (Postgres `record_fingerprint` RPC) reads request headers and hashes
 * IP + User-Agent with sha256. Client never sees IP or UA hashes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  visitorId: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/, "visitorId must be alphanumeric"),
});

export const recordFingerprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabase } = context;
    const { error } = await supabase.rpc("record_fingerprint", {
      p_visitor_id: data.visitorId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
