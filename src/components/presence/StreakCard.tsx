import { Flame } from 'lucide-react';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  targetMinutes?: number; // 하루 목표 (기본 30분)
}

export function StreakCard({
  currentStreak,
  longestStreak,
  todayMinutes,
  targetMinutes = 30,
}: StreakCardProps) {
  const progress = Math.min(Math.round((todayMinutes / targetMinutes) * 100), 100);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 w-full">
      <div className="flex items-center justify-between mb-5">
        {/* 현재 연속 */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-zinc-400">현재 연속</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tighter">{currentStreak}</span>
              <span className="text-xl text-zinc-400">일</span>
            </div>
          </div>
        </div>

        {/* 최장 기록 */}
        <div className="text-right">
          <p className="text-xs text-zinc-500">최장 기록</p>
          <p className="text-2xl font-semibold text-zinc-300">{longestStreak}일</p>
        </div>
      </div>

      {/* 오늘 진행도 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-zinc-400">오늘 Presence</span>
          <span className="text-sm font-medium">
            {todayMinutes} / {targetMinutes}분
          </span>
        </div>

        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-zinc-500">0분</span>
          <span className="text-xs text-orange-400 font-medium">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
