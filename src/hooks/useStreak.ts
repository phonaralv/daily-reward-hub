import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
}

export function useStreak() {
  return useQuery<StreakData>({
    queryKey: ['streak'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 1. presence_streaks에서 현재 스트릭 정보 가져오기
      const { data: streakData, error: streakError } = await supabase
        .from('presence_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', user.id)
        .single();

      if (streakError && streakError.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Streak fetch error:', streakError);
      }

      // 2. 오늘 daily_presence에서 시간 가져오기
      const today = new Date().toISOString().split('T')[0];
      const { data: presenceData, error: presenceError } = await supabase
        .from('daily_presence')
        .select('total_minutes')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (presenceError && presenceError.code !== 'PGRST116') {
        console.error('Daily presence fetch error:', presenceError);
      }

      return {
        currentStreak: streakData?.current_streak ?? 0,
        longestStreak: streakData?.longest_streak ?? 0,
        todayMinutes: presenceData?.total_minutes ?? 0,
      };
    },
    staleTime: 1000 * 30, // 30초 동안 fresh
    refetchInterval: 1000 * 60, // 1분마다 자동 갱신
  });
}
