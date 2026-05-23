
# Phase 2 Finalize + Phase 3 (Referral · Fraud · VIP · Leaderboard) — Single PR

승인된 범위 전체를 단일 PR로 구현합니다. 단일 진입점 / 원자성 / 실시간 / 보안 / 확장성 — 5대 우위 원칙을 모든 신규 코드에 일관되게 적용합니다.

---

## Step 0 — Phase 2 Fix-ups (즉시)

1. `tests/presence/budget.test.ts` — `MAX_SOURCES_PER_ROUTE` 8 → 10 (주석으로 사유 명시)
2. `src/shared/lib/presence/sources/rewardClaimSource.ts` — `setTimeout(...)` 라인에 `// allow-source-fade` 주석 추가

검증: `bunx vitest run` 59/59 + `bash scripts/guards.sh` 12/12 PASS.

### Phase 2 최종 보고 (Step 0 직후 chat 메시지로)

- HEAD SHA + Phase 2 누적 변경 파일 목록
- DB: streaks / quests / user_quests + ENUM + 3 RPCs + RLS + grants 요약
- vitest / guards 최종 결과
- 단일 진입점 grep 0건 증빙
- 5대 기술 우위 체크리스트 (Phase 2 시점)

---

## Step 1 — DB Migration (Phase 3 핵심)

단일 마이그레이션 파일로 일괄 적용. 모든 RPC는 `SECURITY DEFINER` + `REVOKE PUBLIC` + `GRANT authenticated`.

### 1.1 ENUM 확장

```sql
ALTER TYPE ledger_kind ADD VALUE IF NOT EXISTS 'referral_reward';
ALTER TYPE ledger_kind ADD VALUE IF NOT EXISTS 'vip_bonus';
ALTER TYPE ledger_kind ADD VALUE IF NOT EXISTS 'leaderboard_reward';
```

### 1.2 신규 테이블 (6종)

| 테이블 | 핵심 컬럼 | RLS |
|---|---|---|
| `referral_codes` | user_id PK, code UNIQUE, created_at | self_select |
| `referrals` | referrer_id, referee_id UNIQUE, code, created_at, status (`pending|rewarded|fraud`) | referrer/referee self_select |
| `device_fingerprints` | id, user_id, visitor_id, server_hash, ip_hash, ua_hash, first_seen, last_seen, hit_count, UNIQUE(user_id, visitor_id) | self_select |
| `fraud_signals` | id, user_id, kind, severity (`low|med|high`), rule_code, payload jsonb, created_at | self_select (low/med only) |
| `leaderboard_periods` | id, kind (`weekly|monthly`), starts_at, ends_at UNIQUE, settled_at | public_select |
| `leaderboard_entries` | period_id, user_id, score, rank, reward_amount, UNIQUE(period_id, user_id) | public_select |

### 1.3 RPC 함수 (모두 SECURITY DEFINER, search_path=public)

- `create_referral_code() RETURNS text` — idempotent, 6자 base32
- `redeem_referral_code(p_code text) RETURNS TABLE(...)` — 자기-초대 차단, UNIQUE(referee) 차단, fingerprint 동일 차단, `referrals` INSERT만 (보상은 별도)
- `record_fingerprint(p_visitor_id text, p_client_hints jsonb) RETURNS void` — 서버 IP/UA hash 보강 (RPC 내부에서 `current_setting('request.headers', true)::jsonb` 사용), upsert
- `evaluate_referral_fraud(p_referrer uuid, p_referee uuid) RETURNS text` — 'ok'|'review'|'block'; 4규칙 (R1~R4) 평가 후 `fraud_signals` append
- `claim_referral_reward(p_referee uuid) RETURNS TABLE(amount bigint, new_balance bigint)` — fraud 평가 → ok시 `_apply_reward()` 호출 → `referrals.status='rewarded'`
- `vip_tier(p_user_id uuid) RETURNS int` — 누적 `wallets.balance` + 30일 ledger 합산 기반 0~5 tier
- `vip_multiplier(p_user_id uuid) RETURNS numeric` — `1.00 / 1.05 / 1.10 / 1.15 / 1.25 / 1.50`
- `_apply_reward(p_user uuid, p_kind ledger_kind, p_base bigint, p_ref_kind text, p_ref_id text) RETURNS bigint` — **신규 내부 헬퍼**: VIP multiplier 적용 후 `ledger_entries` INSERT, 최종 amount 반환. 모든 claim RPC가 이걸 호출 → 단일 multiplier 경로 보장
- 기존 `claim_daily_reward` / `claim_quest`를 `_apply_reward` 사용으로 리팩터 (외부 인터페이스 무변경, base amount만 전달)
- `settle_leaderboard(p_period_id uuid) RETURNS int` — advisory lock + `settled_at IS NULL` 가드, 상위 N명에 `_apply_reward(kind='leaderboard_reward')` 루프, `ref_id='lb:<period>:<rank>'` UNIQUE로 멱등

### 1.4 pg_cron

- weekly leaderboard 정산: 매주 월요일 00:05 UTC → `/api/public/hooks/settle-leaderboard` POST
- 라우트 핸들러가 현재 만료 period 조회 후 `settle_leaderboard()` 호출

### 1.5 Realtime publication

- 기존 `ledger_entries` 그대로 — 신규 kind 자동 push (확장성 증명, 추가 작업 0)
- `leaderboard_entries`는 `ADD TABLE`로 publication 추가 (rank 변동 push)

---

## Step 2 — Entities (3 신규)

- `src/entities/referral/index.ts` — `ReferralCodeDTO`, `ReferralDTO`, `myReferralQueryOptions`, `useMyReferrals`
- `src/entities/vip/index.ts` — `VipDTO { tier, multiplier, nextThreshold }`, `useMyVip`
- `src/entities/leaderboard/index.ts` — `LeaderboardPeriodDTO`, `LeaderboardEntryDTO`, `useCurrentLeaderboard`

ENUM 확장:
- `src/entities/ledger/index.ts` — `LedgerKind` += `'referral_reward' | 'vip_bonus' | 'leaderboard_reward'`

---

## Step 3 — Server Functions

- `src/lib/referral.functions.ts` — `getMyReferralCode`, `redeemReferralCode`, `claimReferralReward`, `listMyReferrals`
- `src/lib/vip.functions.ts` — `getMyVip` (RPC `vip_tier` + `vip_multiplier` 호출만, 클라에서 multiplier 계산 금지)
- `src/lib/leaderboard.functions.ts` — `getCurrentLeaderboard`, `getMyRank`
- `src/lib/fingerprint.functions.ts` — `recordFingerprint(visitorId, clientHints)` → RPC

모두 Zod inputValidator + `requireSupabaseAuth` middleware.

---

## Step 4 — Fraud Infrastructure

- `bun add @fingerprintjs/fingerprintjs`
- `src/shared/lib/fraud/fingerprint.ts` — fpjs wrapper, `ensureFingerprint()` (idempotent, 세션당 1회)
- `src/routes/__root.tsx` — 로그인 직후 `ensureFingerprint()` → `recordFingerprint()` 호출 (root 1회만)
- 서버 측: `record_fingerprint` RPC 내부에서 `request.headers`의 `x-forwarded-for`, `user-agent`, `accept-language` 해시(`encode(digest(...,'sha256'),'hex')`) → 컬럼 저장

규칙 (`evaluate_referral_fraud` 내부):
- R1: referrer.visitor_id ∩ referee.visitor_id ≠ ∅ → block
- R2: 같은 ip_hash 24h 내 referee 3건 초과 → block
- R3: referee 가입 후 1h 내 referral redeem → review
- R4: referrer의 `fraud_signals` severity=high 존재 → block

---

## Step 5 — PresenceSource (1 신규)

- `src/shared/lib/presence/sources/leaderboardRankSource.ts` — react-query 캐시 어댑터 (walletBalanceSource 패턴 그대로). PURITY 유지, React-free.
- `src/shared/lib/presence/sources/index.ts` — `PRESENCE_SOURCE_KEYS.leaderboardRank = 'leaderboard-rank'`
- `tests/presence/budget.test.ts` — `MAX_SOURCES_PER_ROUTE` 10 → 12 재조정

---

## Step 6 — UI Features

- `src/features/referral/ReferralCard.tsx` — 내 코드 표시 + 복사 + 진행도
- `src/features/referral/RedeemCodeForm.tsx` — 신규 가입자가 코드 입력
- `src/features/referral/ReferralList.tsx` — 내가 초대한 사람 목록 + status
- `src/features/vip/VipBadge.tsx` — tier 표시 (multiplier는 서버 값 그대로 read-only)
- `src/features/leaderboard/LeaderboardTable.tsx` — 현재 period rank 표시
- `src/routes/refer.tsx` — 기존 placeholder 교체: ReferralCard + RedeemCodeForm + ReferralList
- `src/routes/missions.tsx` — VipBadge + LeaderboardTable 위젯 추가

---

## Step 7 — Server Route (cron)

- `src/routes/api/public/hooks/settle-leaderboard.ts`
  - POST 핸들러: `apikey` 헤더 검증 → `supabaseAdmin.rpc('settle_leaderboard', { p_period_id })` 호출
  - 결과 로깅 + JSON 응답
- `supabase--insert`로 pg_cron schedule 등록 (매주 월 00:05 UTC)

---

## Step 8 — Guards & Tests

### `scripts/guards.sh` 추가
- **Guard #13** — `referrals`/`referral_codes`/`leaderboard_periods`/`leaderboard_entries`/`fraud_signals`/`device_fingerprints` 직접 write 금지 (RPC만)
- **Guard #14** — `vip_multiplier` 계산을 클라이언트가 수행하지 않음 (`src/` grep: 곱셈/하드코딩 multiplier 숫자 + `vip` 키워드 패턴 금지, RPC 응답만 read)
- **Guard #15** — fpjs는 `src/shared/lib/fraud/fingerprint.ts` 외에서 import 금지

### Tests
- `tests/reward/referral.test.ts` — 단일 진입점 유지, RPC 외 mutation 0, 자기-초대 거부 시뮬레이션 (정적 grep + behavior)
- `tests/reward/fraud-rules.test.ts` — R1~R4 규칙 정적 invariant
- `tests/reward/leaderboard.test.ts` — settle 멱등성 보장 (UNIQUE ref_id), settle_at 가드
- `tests/reward/vip-multiplier.test.ts` — `_apply_reward`가 모든 claim 경로의 단일 multiplier 진입점임을 grep으로 증명

---

## Step 9 — 검증 & 최종 보고

- `bunx vitest run` (목표 100%)
- `bash scripts/guards.sh` (15/15)
- aliveness-check before/after diff = 0
- `rg "\.from\(.(ledger_entries|wallets|streaks|user_quests|referrals|referral_codes|fraud_signals|device_fingerprints|leaderboard_entries|leaderboard_periods).\)\.(insert|update|delete|upsert)" src` → 0건
- 5대 우위 체크리스트 + Phase 3 변경 파일 목록 + HEAD SHA 보고

---

## 예상 변경 규모

- 신규: ~26 파일 (DB 1, entities 3, server fns 4, fraud 2, presence 1, features 5, route 1, tests 4, guards 0(편집))
- 수정: ~6 파일 (`__root.tsx`, `missions.tsx`, `refer.tsx`, `ledger/index.ts`, `guards.sh`, `budget.test.ts`)
- 의존성: `@fingerprintjs/fingerprintjs` 1개 추가

## 리스크 & 대응 (재확인)

| # | 리스크 | 대응 |
|---|---|---|
| R1 | self-referral | RPC에서 `referrer != referee` + fingerprint 일치 차단 |
| R2 | fpjs visitor_id 위조 | 서버 IP/UA 해시 결합, 단독 신뢰 금지 |
| R3 | VIP multiplier 비결정성 | `_apply_reward` 단일 헬퍼 + `ref_id`에 multiplier 메타 |
| R4 | leaderboard 중복 정산 | advisory lock + `settled_at IS NULL` + UNIQUE ref_id |
| R5 | pg_cron 권한 폭주 | 전용 함수 1개만 grant, system actor |
| R6 | fraud false positive | `'review'` 상태 + 감사 로그 (fraud_signals) |
| R7 | ENUM 확장으로 기존 트리거 영향 | `apply_ledger_to_wallet`은 kind 무관 — 영향 0 |

---

승인되면 Step 0부터 순차 진행하고, Step 0 직후 Phase 2 최종 보고를, Step 9 후 Phase 3 최종 보고를 제출합니다.
