import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    // 인증 확인
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { is_present, timestamp } = await req.json();

    // presence_states 업데이트
    const { error: upsertError } = await supabase
      .from("presence_states")
      .upsert({
        user_id: user.id,
        is_present: is_present,
        last_seen_at: timestamp,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id"
      });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response("Database error", { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("presence-heartbeat error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});