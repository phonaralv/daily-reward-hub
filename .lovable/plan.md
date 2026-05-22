# PR-2 — PHONARA V2 핵심 경제/미션/소셜 루프 (apps/web)

PR-1에서 만든 모바일 셸·PWA·Presence Engine·알림 토대 위에,
**실제 유저가 돈/포인트를 벌고, 미션을 깨고, 친구를 끌고 오는 핵심 루프**를 구현한다.
여전히 거래/슬롯의 *실제 외부 결제*는 mock — 실제 정산은 PR-3+.

---

## 0. 범위 원칙

- **포함**: wallet 코어, 미션 엔진, 슬롯(무료/페이드 mock), 무료 플레이 루프, 리워드/뽑기, 레퍼럴/바이럴 루프, 계정/KYC stub, 일일 출석, FOMO/limited drop, 알림 트리거.
- **제외(PR-3+)**: 실결제(toss/stripe/온체인), 실 KYC 벤더, 트레이딩 엔진(orderbook/match), 어드민 콘솔, 정산/세금, 푸시 토큰 실송신.
- 모든 RPC는 **server-fn + `requireSupabaseAuth`**, 클라이언트는 절대 `client.server.ts` import 금지 (CI guard).
- 모든 금액은 정수 minor-unit, `phon_amount` 도메인 타입. 클라이언트 가공 금지.

---

## 1. DB 마이그레이션 (Supabase ref `edlhlbwojgdnpdjhorpb`)

순번은 PR-1에서 이어짐. 모두 RLS ON, 정책은 `auth.uid()` 기준.

- `10_wallet.sql` — `wallets(user_id pk, phon bigint, locked bigint, updated_at)`, `wallet_ledger(id, user_id, delta, reason enum, ref_id, created_at)`. **single source of truth**, trigger로 ledger→wallet 합산 검증.
- `11_missions.sql` — `missions(id, code, category, reward_phon, repeat enum, requires, active)`, `mission_progress(user_id, mission_id, progress jsonb, completed_at)`, `mission_claims(...)`.
- `12_slots.sql` — `slot_machines(id, code, rtp, volatility, min_bet, max_bet, free_only)`, `slot_spins(id, user_id, machine_id, bet, payout, seed_hash, server_seed, client_seed, nonce, created_at)`. provably-fair commit/reveal.
- `13_free_play.sql` — `free_play_sessions`, `free_play_drops` (시간당 무료 코인 한도, IP/디바이스 anti-abuse).
- `14_referrals.sql` — `referral_codes(user_id pk, code unique)`, `referrals(referrer_id, referee_id unique, status, reward_state, created_at)`, `referral_rewards_ledger`.
- `15_rewards.sql` — `reward_chests(id, tier, contents jsonb)`, `reward_grants(user_id, chest_id, opened_at, result jsonb)`, `daily_checkin(user_id, day_index, claimed_at)`.
- `16_kill_switches.sql` — 기존 키 + `payouts_enabled`, `slots_enabled`, `referrals_enabled`, `free_play_enabled`, `daily_checkin_enabled`, `viral_boost_multiplier`.
- `17_kyc_stub.sql` — `kyc_profiles(user_id pk, level enum tier0..tier3, country, status, updated_at)` — 실제 벤더 없이 셀프 신고만.

`has_role()` SECURITY DEFINER + `user_roles(user_id, role app_role)`로 admin/operator 분리.

## 2. 서버 함수 (`src/**/*.functions.ts`)

전부 `requireSupabaseAuth` + Zod `inputValidator`. 응답은 `{ ok, data, error }` 통일.

- `wallet.functions.ts` — `getWallet`, `getLedger({cursor,limit})`.
- `missions.functions.ts` — `listMissions`, `progressMission({code, payload})`, `claimMission({id})`. 진행 검증은 서버.
- `slots.functions.ts` — `commitSeed`, `spin({machineId, bet, clientSeed, nonce})`, `revealSeed`. RNG는 서버, `bet`은 `wallets.locked` flow.
- `freePlay.functions.ts` — `claimHourlyDrop()`, rate-limit는 DB `unique(user_id, hour_bucket)`.
- `referrals.functions.ts` — `getMyCode`, `redeemCode({code})`, `listMyReferrals`.
- `rewards.functions.ts` — `openChest({grantId})`, `dailyCheckin()`.
- `account.functions.ts` — `getProfile`, `updateNickname`, `setLocale`, `submitKycStub`.

서버 라우트 (`src/routes/api/public/*`): `referral-share/$code` (OG 이미지/redirect), `pwa-install-callback` (서명 검증).

## 3. 프런트 구조 (FSD 유지)

```text
src/
  entities/    wallet/  mission/  slot/  reward/  referral/  account/
  features/    claim-mission/  spin-slot/  open-chest/  redeem-code/
               daily-checkin/  free-play-claim/  install-reward/
  widgets/     home-hero/  mission-board/  slot-rail/  reward-stream/
               referral-card/  wallet-summary/  fomo-banner/
  routes/      (기존 8개 라우트의 placeholder를 실제 widget으로 교체)
```

각 entity는 `model/` (zustand+react-query selectors), `api/` (server-fn 래퍼), `ui/` (presentational).

## 4. 핵심 화면 교체 (PR-1 placeholder → 실 UI)

- `/` 홈: `WalletSummary` + `DailyCheckinStrip` + `MissionBoard(top3)` + `SlotRail` + `RewardStream` + `ReferralCard` + 기존 Presence 레이어 유지.
- `/missions`: 카테고리 탭(데일리/위클리/이벤트/바이럴), virtualized list, claim 애니메이션(reduced-motion 대응).
- `/slots`: 슬롯 그리드, free/paid 토글(`slots_enabled`/`free_play_enabled`로 자동 비활성).
- `/play-free`: 시간당 카운트다운 + 클레임 버튼 + 누적 그래프(스파크라인).
- `/wallet`: 잔액, 락된 금액, ledger 무한 스크롤, "출금 준비중(PR-3)" CTA.
- `/refer`: 내 코드, 공유 시트(`navigator.share` + 폴백), 단계별 리워드 진행도, 친구 리스트.
- `/trade`: "PR-3에서 오픈" + 워치리스트 placeholder + 가짜 차트 금지 (Presence ticker만 유지).
- `/account`: 닉네임/언어/지역/KYC stub/알림 권한/PWA 설치 상태/로그아웃.

## 5. 바이럴/FOMO 루프

- **Daily check-in** 7일 사이클, 7일째 보상 ×3 (kill switch).
- **Referral 단계 리워드**: 가입 → 첫 미션 → 첫 슬롯 → 7일 retention. 각 단계마다 *양쪽* 보상.
- **Install reward hook**: PR-1의 `appinstalled` → `claimInstallReward` server-fn (1회, fingerprint 중복차단).
- **Limited drop**: 매 4–6시간 랜덤 윈도우, 서버 스케줄 (`pg_cron` + `/api/public/cron/limited-drop`, HMAC 서명). UI는 PR-1 `RewardWaveBanner` 재사용.
- **Streak surge**: 연속 N일 출석 시 multiplier, presence ticker에 자동 메시지 inject.
- **Viral boost multiplier** kill switch로 운영자가 즉시 ×1.5/×2.

## 6. 알림 트리거 (PR-1 큐 사용)

서버에서 `notifications` insert:
- 미션 완료/클레임 가능
- 슬롯 잭팟(개인 threshold)
- 리워드 체스트 도착
- 친구가 가입/첫 미션 클리어
- limited drop 오픈(broadcast)
- check-in 리마인더(KST 21:00)

각 트리거는 `notification_prefs`(PR-1) 키 존중. push 실송신은 PR-9까지 NOOP.

## 7. Provably-fair 슬롯 (mock economy)

- 서버: `server_seed`(per session) HMAC-SHA256 commit → 사용자 노출은 hash만, reveal은 세션 종료 시.
- 클라이언트: `client_seed`, `nonce` 증가.
- `payout = rngFromHmac(server_seed, client_seed, nonce) → paytable(machine)`.
- 모든 spin은 `wallet_ledger`에 `bet`/`payout` 두 줄.

## 8. Anti-abuse / 보안

- Rate limit: free-play, claim, redeem-code는 `(user_id, action, minute_bucket)` unique.
- Referral self-redeem 차단(같은 디바이스 fingerprint hash 검사).
- Install reward 중복: `install_grants(user_id unique, device_hash)`.
- 모든 mutate server-fn은 idempotency key 옵션.
- Zod로 모든 input min/max/regex 강제 (특히 nickname/code).

## 9. i18n / 카피

- `ko` 우선 확장: mission/slot/reward/referral/wallet/account/error 네임스페이스 추가.
- `en` 빈 키 lint로 감지(미번역은 ko fallback). 통화/숫자는 `Intl.NumberFormat('ko-KR')`, KST.

## 10. Presence Engine 후속

- 실 aggregate 이벤트가 들어오기 시작 → `presence_seed_ratio`를 운영이 수동 하향.
- 신규: `useLiveCounter`에 **실 카운트 소스** 옵션 추가 (`source: 'seed' | 'realtime'`), `wallet_grants`/`mission_claims` Realtime 채널을 평균화해 ticker에 inject.

## 11. 성능 목표

- 홈 TTI 모바일 4G ≤ 2.5s 유지 (widget code-split).
- mission/slot 리스트 1000행에서 60fps (react-virtuoso).
- React Query: `wallet` staleTime 5s, `missions` 30s, `ledger` infinite cursor.
- Realtime 채널은 라우트 단위로만 subscribe, unmount 시 close.

## 12. CI 가드 (PR-1 확장)

- `client.server.ts` client import 0건
- 하드코딩 hex/rgb 0건
- ko 키 누락 0건
- server-fn 중 `requireSupabaseAuth` 미사용 + mutate 0건
- Zod inputValidator 미설정 server-fn 0건

## 13. PR-2 완료 정의 (DoD)

1. 신규 가입 → 닉네임 → 데일리 출석 → 미션 1개 클레임 → 슬롯 free spin 1회 → 친구 코드 공유까지 **끊김 없이** 동작.
2. 모든 화면 ko-first, 숫자 tabular, safe-area 정상, reduced-motion 정상.
3. kill switch로 slots/referrals/free-play/payouts 각각 즉시 OFF 가능.
4. PWA 설치 후 install reward 1회 지급 + 중복 차단 확인.
5. `bun run build` 0 error, type-check 0 error, CI guard 통과.

---

### 기술 메모

- 서버 RNG는 `crypto.subtle.importKey` + HMAC (workerd 호환). Node `crypto` 미사용.
- 모든 server-fn은 `method:"POST"` 통일 (mutate든 read든) — preflight 단순화.
- `pg_cron` 스케줄은 `/api/public/cron/*`로 호출, HMAC `x-cron-signature` 강제.
- 슬롯 결과 애니메이션은 framer-motion `useReducedMotion`로 분기, GPU transform만 사용.
