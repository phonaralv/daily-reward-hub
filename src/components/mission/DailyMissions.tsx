import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Mission {
  code: string;
  title: string;
  description: string | null;
  reward_amount: number;
  is_claimed: boolean;
}

export function DailyMissions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      const { data, error } = await supabase.rpc('get_daily_missions');

      if (error) {
        console.error('미션 불러오기 실패:', error);
      } else {
        setMissions(data || []);
      }
      setLoading(false);
    };

    fetchMissions();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-sm text-zinc-400">미션 목록을 불러오는 중...</div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white/80 px-1">오늘의 미션</h3>

      {missions.length === 0 && (
        <div className="text-sm text-zinc-500 px-1">오늘 미션이 없습니다.</div>
      )}

      {missions.map((mission) => (
        <div
          key={mission.code}
          className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3"
        >
          <div>
            <div className="font-medium">{mission.title}</div>
            {mission.description && (
              <div className="text-xs text-zinc-500 mt-0.5">{mission.description}</div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-orange-400">
                +{mission.reward_amount}
              </div>
            </div>

            {mission.is_claimed ? (
              <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                수령 완료
              </div>
            ) : (
              <button
                className="rounded-full bg-white px-4 py-1 text-xs font-medium text-black active:scale-[0.985]"
                onClick={() => alert('수령 기능은 다음에 연결할게!')}
              >
                수령하기
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
