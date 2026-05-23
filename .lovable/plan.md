
# P2 Reward Loop Core — Phase 2 Build Plan

Phase 1에서 증명한 **ledger_entries 단일 진입점 + trigger + Realtime** 패턴 위에, Streak / Quest / PresenceSource 어댑터 2종을 단일 PR로 확장합니다. 모든 설계는 5대 기술 우위(단일 진입점·원자성·실시간·보안·확장성)를 강제하도록 구성됩니다.

---

## 1. Phase 2 범위

### ✅ 포함 (3 묶음, 단일 PR)

**A. Streak 시스템 (Daily Reward 확장)**
- 7일 사이클 + 차등 보상 (D1=100, D2=120, D3=150, D4=180, D5=220, D6=260, D7=400 PHON)
- `claim_daily_reward()` RPC를 streak-aware로 in-place 확장 — 시그니처는 superset (Phase 1 호출부 무중단)
- `StreakDots` 보조 컴포넌트 + `DailyRewardCard`에 streak 시각화

**B. Quest 시스템**
- `quests` 카탈로그 + `user_quests` 진행도
- `progress_quest(code, delta)` — 진행도 누적(원자), 자동 completed_at 셋
- `claim_quest(code)` — completed AND NOT claimed → `ledger_entries` INSERT(kind='quest_reward')
- 시드 3건: `first_daily_claim`, `claim_7_days`, `wallet_visit_3`
- `QuestList` 위젯 + `missions.tsx` append

**C. PresenceSource 어댑터 2종**
- `walletBalanceSource` — react-query `WALLET_QK` 캐시 어댑터 (zero-mutation, 읽기 전용)
- `rewardClaimSource` — in-memory 1-record + 30s fade, `useLedgerStream`이 INSERT 페이로드 push
- `PRESENCE_SOURCE_KEYS` 갱신, 기존 9 Source/5 Primitive 0건 수정

### ❌ 제외 (Phase 3+)

Referral · VIP · Leaderboard · Quest admin UI · Push notification 연동 · Anti-cheat 강화 · Quest 카테고리/난이도 · WalletHud root-sticky 노출.

---

## 2. 신규/수정 파일 예측

### 신규 (총 ~14 파일)

```text
DB
└─ supabase/migrations/<ts>_phase2_streak_quest.sql

Entities (2)
├─ src/entities/streak/index.ts
└─ src/entities/quest/index.ts

Server Functions (2 파일 / 4 함수)
├─ src/lib/streak.functions.ts      (getStreak)
└─ src/lib/quest.functions.ts       (listMyQuests, progressQuest, claimQuest)

PresenceSource (2)
├─ src/shared/lib/presence/sources/walletBalanceSource.ts
└─ src/shared/lib/presence/sources/rewardClaimSource.ts

UI (2)
├─ src/features/reward/StreakDots.tsx
└─ src/features/quest/QuestList.tsx

Tests (3)
├─ tests/reward/streak.test.ts
├─ tests/reward/quest.test.ts
└─ tests/presence/reward-sources.test.ts
```

### 수정 (최소 침습, ~6 파일)

- `src/lib/daily-reward.functions.ts` — 응답 superset (`amount, newBalance, streakDay, nextAmount, alreadyClaimed`)
- `src/features/reward/DailyRewardCard.tsx` — `<StreakDots/>` + streak 응답 반영
- `src/shared/lib/realtime/useLedgerStream.ts` — INSERT payload 분기 → `rewardClaimSource.push()`
- `src/shared/lib/presence/sources/index.ts` — 2 source export + `PRESENCE_SOURCE_KEYS`
- `src/routes/missions.tsx` — `<QuestList/>` 1줄 삽입
- `scripts/guards.sh` — Guard #11 추가

### 보호 대상 (0건 수정)

Phase 1 entities/server fn/위젯, `__root.tsx` mount 지점, Presence Primitive 5종, 기존 Source 9종, `styles.css`, `AppShell`, `client.ts`/`auth-middleware.ts`/`types.ts`.

---

## 3. 작업 순서

```text
Step 1 — DB 마이그레이션 (단일 commit)
  · TABLE streaks(user_id PK→profiles.id, current_day int, last_claim_date date,
                  longest int, updated_at)
  · TABLE quests(code text PK, title text, target int, reward_amount bigint,
                 active bool, sort_order int)
  · TABLE user_quests(user_id, quest_code → quests.code, progress int,
                      completed_at, claimed_at, UNIQUE(user_id, quest_code))
  · RPC claim_daily_reward()  — streak 계산 + 차등 amount + ledger INSERT
        ref_id='daily:YYYY-MM-DD' (UNIQUE 의존 idempotent)
  · RPC progress_quest(p_code, p_delta)
        ON CONFLICT UPDATE SET progress = LEAST(target, progress + delta)
        progress=target 도달시 completed_at=now()
  · RPC claim_quest(p_code)
        completed AND NOT claimed → ledger INSERT(kind='quest_reward',
        ref_kind='quest', ref_id=p_code) → trigger가 wallet 갱신
  · SEED quests 3건 (insert tool로 별도 처리)
  · RLS: 전 3 테이블 SELECT-only(auth.uid()=user_id), 쓰기는 RPC만
  · Realtime publication: 변경 없음 (ledger_entries 단일 채널 유지)
  · Supabase linter 통과 검증

Step 2 — Entities (2 파일)
  · StreakDTO + STREAK_QK + useStreak
  · QuestDTO + UserQuestDTO + QUEST_QK + useMyQuests

Step 3 — Server Functions (2 파일)
  · streak.functions.ts: getStreak
  · quest.functions.ts:  listMyQuests / progressQuest / claimQuest
  · 모두 createServerFn + requireSupabaseAuth + Zod
  · 보상 지급은 supabase.rpc() 단일 경로 (직접 ledger INSERT 0건)

Step 4 — PresenceSource + Realtime 분기 (3 파일)
  · rewardClaimSource.ts — push(entry) + 30s fade, useSource 호환,
                            React import 0건 (Guard #9)
  · walletBalanceSource.ts — queryClient 구독 → 값만 노출
  · useLedgerStream.ts 확장 — INSERT payload → rewardClaimSource.push()
                              (root 1회 마운트 유지)
  · sources/index.ts — export + PRESENCE_SOURCE_KEYS 갱신

Step 5 — UI (3 파일, append-only)
  · StreakDots.tsx (7-dot 그리드, 오늘 강조)
  · DailyRewardCard.tsx — StreakDots 삽입 + streakDay/nextAmount 반영
  · QuestList.tsx + missions.tsx 1줄 삽입

Step 6 — 가드 + 테스트
  · scripts/guards.sh Guard #11:
      "useLedgerStream / supabase.channel( 호출이 라우트 파일에 없음"
  · tests/reward/streak.test.ts   — 단일 진입점 재검증
  · tests/reward/quest.test.ts    — 단일 진입점 재검증
  · tests/presence/reward-sources.test.ts — Source 순도(no React)

Step 7 — 검증
  · vitest 전체 PASS (50 + 신규 ~12 → ≥62)
  · scripts/guards.sh 11/11 PASS
  · ESLint PASS (wallets/ledger 직접 변경 0건)
  · 단일 진입점 grep 증빙 보고
```

---

## 4. 완료 기준 (체크리스트)

### 단일 진입점 (Audit-grade)
- [ ] `.from('wallets').{insert|update|upsert|delete}` 전 코드 0건
- [ ] `.from('ledger_entries').{insert|update|delete|upsert}` 전 코드 0건
- [ ] 보상 지급 경로 전부 `supabase.rpc('claim_*')` 만 사용
- [ ] tests/reward/single-entry-point.test.ts (Phase 1) 여전히 PASS

### 원자성 + 멱등성
- [ ] 모든 claim RPC가 `ledger_entries.UNIQUE(user_id, ref_kind, ref_id)` 의존
- [ ] `claim_daily_reward` × N회 호출 → ledger 1건만 생성 (테스트로 증빙)
- [ ] `claim_quest` × N회 호출 → ledger 1건만 생성
- [ ] `progress_quest` 동시 호출 안전 (ON CONFLICT 원자 update)

### 실시간 + 성능
- [ ] `useLedgerStream` mount 위치 `__root.tsx` 1곳 (Guard #11 PASS)
- [ ] 라우트 파일 내 `supabase.channel(` 호출 0건
- [ ] `rewardClaimSource`/`walletBalanceSource` React import 0건 (Guard #9)
- [ ] PresenceSource 패턴 통해 re-render 최소화 (useSource 경유)

### 보안 (Security by Design)
- [ ] 모든 RPC `SECURITY DEFINER` + `SET search_path=public`
- [ ] streaks/quests/user_quests RLS SELECT-only, 쓰기 정책 0건
- [ ] 보상 amount는 서버(`quests.reward_amount` / RPC 내 streak 테이블)에서만 결정
- [ ] 클라이언트 입력은 quest code(text)만 — 보상 금액 절대 미수신
- [ ] supabase linter 경고 0건 (또는 사전 합의 항목만)

### 확장성
- [ ] 향후 referral/vip/event 추가시 `ledger_kind` enum + RPC 한 개만 추가하면 완성됨을 코드로 증명
- [ ] ledger_kind enum에 신규 값 추가가 가능 (PR 외 수정 불필요한 구조)

### UI / 회귀
- [ ] DailyRewardCard 클릭 1회 → +N PHON 토스트 + streak 진행 시각화
- [ ] QuestList missions 라우트 렌더 + completed quest claim 가능
- [ ] Primitive 5종, Source 9종, styles.css 수정 0건
- [ ] aliveness-check 4 invariants 유지 (사용자 환경 실행)

### CI
- [ ] vitest ≥62 PASS
- [ ] scripts/guards.sh 11/11 PASS
- [ ] ESLint 0 error

---

## 5. 리스크 및 대응

| # | 리스크 | 영향 | 대응 |
|---|--------|------|------|
| R1 | `claim_daily_reward` 시그니처 변경으로 Phase 1 클라이언트 회귀 | 중 | 응답 superset(`streak_day`, `next_amount` 옵셔널 추가). 기존 호출부는 amount/new_balance만 읽음 → 무중단 |
| R2 | Streak 경계 케이스 (timezone, 자정 직후, 갭) | 중 | UTC 고정. `last_claim_date = today` → already_claimed. `today - last = 1` → day+1 (mod 7). `>1` → day=1 리셋. RPC 주석에 명세 못박음 |
| R3 | rewardClaimSource purity 위반 (Guard #9) | 중 | 모듈 패턴 + setTimeout만 사용, React/scheduler 직접 import 금지. 정적 테스트로 검증 |
| R4 | Realtime 채널 라우트 중복 마운트 | 중 | Guard #11 grep으로 `supabase.channel(` / `useLedgerStream(` 호출이 라우트 파일에 없음을 차단 |
| R5 | quest progress race condition | 저~중 | RPC 내부 `INSERT … ON CONFLICT UPDATE SET progress=LEAST(target, progress+delta)` 원자화 |
| R6 | quest claim 중복 지급 | 높음 | `ledger_entries.UNIQUE(user_id, ref_kind, ref_id)` 의존, ref_id=quest_code. INSERT 실패시 `already_claimed` 반환. 멱등성 보장 |
| R7 | 클라이언트가 amount 위조 시도 | 높음 | 클라이언트는 quest code만 송신. amount는 quests.reward_amount(서버 row)에서 RPC 내부 결정. RLS도 SELECT-only |
| R8 | types.ts 재생성 타이밍 (migration 후) | 저 | Step 1 migration → 자동 재생성 대기 → Step 2 코드 작성 순서 엄수 |
| R9 | 단일 PR 범위 과대 → 회귀 위험 | 중 | 기존 자산 수정 6개로 한정(라인 단위 추가만), 보호 대상 명시. 신규 파일은 격리되어 회귀 표면 최소 |
| R10 | 크레딧 효율 | 저 | 제외 항목(Referral/VIP/Leaderboard/Admin) 절대 손대지 않음. UI는 위젯 신규 + 라우트 1줄 삽입만 |

---

## 결정 요청

위 범위·순서·완료기준에 동의하시면 Build Mode 전환 후 Step 1(DB 마이그레이션)부터 단일 PR로 끝까지 진행하겠습니다.

특히 다음 2가지는 사전 확정이 필요합니다:

1. **Streak 보상 곡선** (D1~D7: 100/120/150/180/220/260/400 PHON) — OK 또는 다른 값 지정
2. **초기 quest 시드 3건** (`first_daily_claim` +50, `claim_7_days` +500, `wallet_visit_3` +30) — OK 또는 수정

별도 의견 없으시면 위 기본값으로 진행하겠습니다.
