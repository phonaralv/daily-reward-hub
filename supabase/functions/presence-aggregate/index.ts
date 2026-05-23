import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // presence_states가 있는 모든 유저 조회
    const { data: states, error } = await supabase
      .from("presence_states")
      .select("user_id, last_seen_at, updated_at");

    if (error) throw error;

    let processed = 0;

    for (const state of states || []) {
      if (!state.last_seen_at) continue;

      const lastSeen = new Date(state.last_seen_at);
      const lastProcessed = state.updated_at ? new Date(state.updated_at) : lastSeen;

      // 마지막 처리 이후 경과 시간 (분)
      const diffMinutes = Math.max(
        0,
        Math.floor((lastSeen.getTime() - lastProcessed.getTime()) / (1000 * 60))
      );

      if (diffMinutes <= 0) continue;

      // daily_presence에 시간 누적
      const { data: existing } = await supabase
        .from("daily_presence")
        .select("total_minutes")
        .eq("user_id", state.user_id)
        .eq("date", today)
        .single();

      const currentMinutes = existing?.total_minutes || 0;

      await supabase
        .from("daily_presence")
        .upsert({
          user_id: state.user_id,
          date: today,
          total_minutes: currentMinutes + diffMinutes,
          updated_at: now.toISOString(),
        }, {
          onConflict: "user_id,date"
        });

      processed++;
    }

    return new Response(JSON.stringify({
      success: true,
      processedUsers: processed
    }));

  } catch (error) {
    console.error("presence-aggregate error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});