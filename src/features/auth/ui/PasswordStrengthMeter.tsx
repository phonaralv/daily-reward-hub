/**
 * PasswordStrengthMeter — effective password strength scoring.
 *
 * Pure scoring function `scorePassword(pwd, { email? })` returns 0..4.
 *
 * Algorithm (deliberately strict; deterministic, no deps):
 *   +length:   8→+1, 12→+2, 16→+3
 *   +variety:  +1 per class (lower/upper/digit/symbol), max +3
 *   −penalty:  ≥3 same char in a row, keyboard run (qwerty/asdf/zxcv/1234/abcd),
 *              top weak dict substring match, email local-part substring,
 *              single-class only (all lower OR all digit) caps score at 1.
 *   Final clamp 0..4.
 */
import { useMemo } from "react";

const WEAK_DICT = [
  "password", "passw0rd", "qwerty", "qwerty123", "abc123", "111111", "123456",
  "12345678", "123456789", "1234567890", "letmein", "welcome", "admin", "admin123",
  "iloveyou", "monkey", "dragon", "sunshine", "princess", "football", "baseball",
  "master", "shadow", "superman", "batman", "trustno1", "phonara", "korea", "seoul",
  "asdf", "asdfasdf", "zxcv", "zxcvbnm", "1q2w3e", "1q2w3e4r", "qazwsx", "pokemon",
  "starwars", "michael", "jennifer", "thomas", "jordan", "hunter", "harley",
  "ranger", "jessica", "buster", "charlie", "andrew", "michelle",
];

const KEYBOARD_RUNS = [
  "qwertyuiop", "asdfghjkl", "zxcvbnm",
  "1234567890", "0987654321",
  "abcdefghijklmnopqrstuvwxyz",
];

function hasKeyboardRun(s: string): boolean {
  if (s.length < 4) return false;
  const lower = s.toLowerCase();
  for (const run of KEYBOARD_RUNS) {
    for (let i = 0; i <= run.length - 4; i++) {
      const seg = run.slice(i, i + 4);
      if (lower.includes(seg)) return true;
    }
  }
  return false;
}

function hasRepeat(s: string): boolean {
  return /(.)\1{2,}/.test(s);
}

export interface ScoreResult {
  score: 0 | 1 | 2 | 3 | 4;
  /** Korean guidance message */
  hint: string;
}

export function scorePassword(pwd: string, opts?: { email?: string }): ScoreResult {
  if (!pwd) return { score: 0, hint: "비밀번호를 입력해주세요." };
  if (pwd.length < 8) return { score: 0, hint: "8자 이상이어야 합니다." };

  let score = 0;

  // length
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (pwd.length >= 16) score += 1;

  // variety
  const classes =
    (/[a-z]/.test(pwd) ? 1 : 0) +
    (/[A-Z]/.test(pwd) ? 1 : 0) +
    (/[0-9]/.test(pwd) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pwd) ? 1 : 0);
  score += Math.min(3, classes);

  // penalties
  const lower = pwd.toLowerCase();
  let weakHit: string | null = null;
  for (const w of WEAK_DICT) {
    if (lower.includes(w)) {
      weakHit = w;
      break;
    }
  }
  if (weakHit) score -= 3;
  if (hasKeyboardRun(pwd)) score -= 2;
  if (hasRepeat(pwd)) score -= 1;

  // email local-part overlap
  const local = opts?.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) score -= 2;

  // single-class cap
  if (classes <= 1) score = Math.min(score, 1);

  // clamp 0..4 (we normalize 1..6 raw → 0..4)
  if (score < 0) score = 0;
  if (score > 4) score = 4;

  let hint: string;
  if (weakHit) hint = `너무 흔한 패턴이 포함돼 있어요(${weakHit}).`;
  else if (hasKeyboardRun(pwd)) hint = "키보드 순서를 피해주세요.";
  else if (hasRepeat(pwd)) hint = "같은 문자가 3번 이상 반복돼요.";
  else if (classes <= 1) hint = "대/소문자, 숫자, 기호를 섞어주세요.";
  else if (pwd.length < 12) hint = "12자 이상을 권장합니다.";
  else if (score < 3) hint = "조금만 더 다양하게 조합해보세요.";
  else if (score === 3) hint = "괜찮아요. 더 길게 만들면 더 안전해요.";
  else hint = "아주 강력합니다.";

  return { score: score as ScoreResult["score"], hint };
}

const SEG_COLORS = [
  "hsl(0 80% 60%)",
  "hsl(20 95% 60%)",
  "hsl(190 95% 60%)",
  "hsl(268 92% 68%)",
  "hsl(145 80% 55%)",
];

const LABELS = ["매우 약함", "약함", "보통", "강함", "매우 강함"];

export function PasswordStrengthMeter({
  password,
  email,
}: {
  password: string;
  email?: string;
}) {
  const { score, hint } = useMemo(
    () => scorePassword(password, { email }),
    [password, email],
  );
  const filled = password ? Math.max(1, score + 1) : 0;
  const labelColor = password ? SEG_COLORS[score] : "hsl(0 0% 100% / 0.4)";

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full bg-white/8 transition-colors duration-200"
            style={{
              backgroundColor:
                i < filled ? SEG_COLORS[score] : "hsl(0 0% 100% / 0.08)",
              boxShadow:
                i < filled ? `0 0 12px ${SEG_COLORS[score]}55` : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between px-0.5 text-[11px]">
        <span style={{ color: labelColor }} className="font-medium">
          {password ? LABELS[score] : "비밀번호 강도"}
        </span>
        <span className="text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}
