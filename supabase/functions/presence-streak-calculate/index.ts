import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const now = new Date();

    // KST 기준 어제 날짜 계산
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    // 어제 qualified = true 인 유저 조회
    const { data: qualifiedUsers, error } = await supabase
      .from("daily_presence")
      .select("user_id")
      .eq("date", yesterdayStr)
      .eq("qualified", true);

    if (error) throw error;

    let updatedCount = 0;
    let rewardedCount = 0;

    for (const user of qualifiedUsers || []) {
      const userId = user.user_id;

      // 현재 streak 정보 조회
      const { data: streakData } = await supabase
        .from("presence_streaks")
        .select("*")
        .eq("user_id", userId)
        .single();

      const currentStreak = streakData?.current_streak || 0;
      const longestStreak = streakData?.longest_streak || 0;
      const lastQualified = streakData?.last_qualified_date;

      let newStreak = 1;

      if (lastQualified) {
        const lastDate = new Date(lastQualified);
        const diffDays = Math.floor(
          (yesterday.getTime() - lastDate.getTime()) / (1000 * 3600 * 24)
        );

        if (diffDays === 1) {
          newStreak = currentStreak + 1;
        }
      }

      const newLongest = Math.max(longestStreak, newStreak);

      // presence_streaks 업데이트
      await supabase
        .from("presence_streaks")
        .upsert({
          user_id: userId,
          current_streak: newStreak,
          longest_streak: newLongest,
          last_qualified_date: yesterdayStr,
          updated_at: now.toISOString(),
        });

      updatedCount++;

      // 보상 지급 (특정 일수 도달 시)
      const rewardDays = [3, 7, 14, 30, 100];
      if (rewardDays.includes(newStreak)) {
        await grantStreakReward(userId, newStreak);
        rewardedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      updatedUsers: updatedCount,
      rewardedUsers: rewardedCount,
    }));

  } catch (error) {
    console.error("presence-streak-calculate error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

// 보상 지급 함수
async function grantStreakReward(userId: string, streakDays: number) {
  const rewardMap: Record<number, number> = {
    3: 300,
    7: 800,
    14: 1500,
    30: 4000,
    100: 15000,
  };

  const amount = rewardMap[streakDays];
  if (!amount) return;

  const refId = `presence_streak:${streakDays}:${new Date().toISOString().split("T")[0]}`;

  try {
    await supabase.rpc("_apply_reward", {
      p_user: userId,
      p_kind: "presence_streak_reward",
      p_base: amount,
      p_ref_kind: "presence_streak",
      p_ref_id: refId,
    });
  } catch (error) {
    console.error(`Failed to grant streak reward for user ${userId}:`, error);
  }
}