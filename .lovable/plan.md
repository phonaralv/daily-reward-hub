# PHONARA 최종 통합 마스터 플랜 (Phase 4 → 9, 한 번에 마무리)

전제: Step A(로그인/회원가입 UI)와 보안 스캔 픽스는 완료. 이 플랜은 **남은 전부**를 한 번의 build 모드 패스에서 끊지 않고 끝까지 실행하는 단일 작업 카드입니다. 모든 비즈니스 로직은 RPC(SECURITY DEFINER) 단일 진입점, Lovable 전용 SDK 0건, 외부 Supabase 이식 가능 상태를 유지합니다.

---

## 실행 원칙 (전 Phase 공통)
- DB 변경은 **단일 마이그레이션 5개**(Phase별 1개)로 묶어 순서대로 실행. 각각 사용자 승인 → 실행 → 다음 단계.
- 모든 write RPC: `SECURITY DEFINER` + `SET search_path=public` + `REVOKE ALL ... FROM public/anon` + `GRANT EXECUTE ... TO authenticated`.
- 클라이언트 직접 write 0건. 모든 mutation은 RPC 또는 `/api/public/*` 라우트 경유.
- Lovable 종속성 신규 0건. `process.env`/`import.meta.env` + 표준 Supabase JS만 사용.
- 종료 시 Phase별 정형 보고(변경 파일 / 신규 DB 객체 / Guards / Lovable 종속성 / UI/UX 자가평가 / 트레이딩 원자성 / 다음 Phase 확인).

---

## Phase 4 — 운영 회로 봉합 (Realtime / pg_cron / Fingerprint / Guards)

### DB 마이그레이션 #1
- `ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard_entries, referrals;` + `REPLICA IDENTITY FULL`.
- `ensure_current_leaderboard_period(p_kind text)` RPC — ISO weekly 경계 자동 생성, 이미 있으면 no-op (멱등).
- `settle_leaderboard` 기존 함수에 `ensure_current_leaderboard_period('weekly')` 후속 호출 추가 (정산 → 다음 period 자동 개시).
- `pg_cron`: 매주 월 00:05 UTC → `net.http_post(...)` → `https://project--ff1ae9d8-bcad-405a-ac39-d887b54f4b6b.lovable.app/api/public/cron/settle-leaderboard`, header `x-cron-secret: <CRON_SECRET>`.
- `CRON_SECRET` 시크릿은 `add_secret`으로 사용자에게 요청.

### 코드
- `src/routes/api/public/cron/settle-leaderboard.tsx`: `x-cron-secret` 검증 → `supabaseAdmin.rpc('settle_leaderboard')`.
- `src/features/fingerprint/useFingerprintOnAuth.ts`: 로그인 직후 1회 `record_fingerprint(visitor_id, ua_hash, ip_hash)` 호출, 같은 visitor_id는 세션당 1회만.
- `__root.tsx`의 기존 `useFingerprint()`를 위 훅으로 일원화 (중복 호출 제거).
- `scripts/guards.sh` Guards #13/#14/#15 추가:
  - #13: `referrals`/`fraud_signals`에 대한 클라이언트 직접 insert/update 금지(`supabase.from('referrals')` 호출 grep 0).
  - #14: 클라이언트 VIP multiplier 계산 금지 (`* multiplier` / `vipMultiplier(` 호출 grep 0, 서버 RPC만).
  - #15: `FingerprintJS.load(` 호출은 `src/shared/lib/fingerprint.ts` 단 1회.
- 테스트: `tests/phase4/realtime-publication.test.ts`, `leaderboard-idempotent.test.ts`, `referral-rpc-only.test.ts`, `vip-single-entry.test.ts`.

---

## Phase 5 — 트레이딩 엔진 (Bybit/Binance급, Risk Engine 100% 서버)

### DB 마이그레이션 #2
- 테이블: `trading_markets`, `trading_orders`, `trading_positions`, `trading_fills`, `trading_funding`, `mark_prices`, `risk_params`. 전부 RLS ON, self-select 정책만.
- ENUM: `ledger_kind` += `trade_pnl`, `trade_fee`, `funding_fee`, `liquidation`, `slot_bet`, `slot_payout`.
- 단일 진입 RPC (모두 SECURITY DEFINER + `pg_advisory_xact_lock` + UNIQUE `client_order_id` 멱등):
  - `place_order(market, side, type, qty, price?, leverage, reduce_only, client_order_id)` — 증거금 차감, 주문북 등록.
  - `cancel_order(order_id)` — 본인 + open 상태만.
  - `match_orders(market)` — price-time priority 매칭, `trading_fills` 적재, 포지션 업데이트.
  - `update_mark_price(market, price)` — admin/oracle 전용 (role check).
  - `recompute_position(user, market)` — 유지증거금/청산가/PnL 재계산.
  - `liquidate_position(user, market)` — 청산 조건 충족 시만, 멱등.
  - `apply_funding(market)` — 정기 펀딩 정산.
  - `spend_phon(amount, ref_kind, ref_id)` — 슬롯/주문 차감 단일 진입점.
- Realtime: `trading_orders`, `trading_positions`, `mark_prices`, `trading_fills` ADD.
- pg_cron: `match_orders` 1초, `apply_funding` 8시간, `update_mark_price` 외부 어댑터 호출 5초.

### 코드
- `src/lib/trading/*.functions.ts`: `placeOrder`, `cancelOrder`, `getOrderBook`, `getPositions`, `getFills` server functions (`requireSupabaseAuth`).
- `src/features/trade/` UI: `lightweight-charts` 차트, 실시간 오더북, 포지션/주문/체결 패널, Long/Short 토글, 레버리지 슬라이더, 실시간 PnL.
- `src/routes/trade.tsx` 전면 재작성 — 다크 네온 + 글래스 + 모바일 우선.
- `src/routes/api/public/cron/match-orders.tsx`, `apply-funding.tsx`, `mark-price.tsx` — 동일 `x-cron-secret` 검증.
- Guard #16: 트레이딩 write 전부 RPC 경유 검증.
- 테스트: `place-order-idempotent.test.ts`, `risk-engine.test.ts`, `liquidation.test.ts`, `funding.test.ts`.

---

## Phase 6 — 인증 강화 + 결제 (Stripe)

### DB 마이그레이션 #3
- `_authenticated` 가드용 `profiles` 자동 생성 트리거 점검.
- Stripe 웹훅 → `apply_purchase_credit(user_id, amount, stripe_event_id)` RPC (멱등, event_id UNIQUE).

### 코드
- `src/features/auth/AuthenticatedLayout.tsx.bak` 복원 → `src/routes/_authenticated.tsx`로 재배치. `beforeLoad`에서 `supabase.auth.getUser()` 검증 후 미인증 시 `/login` redirect.
- 보호 라우트(`wallet`, `account`, `missions`, `trade`, `refer`, `leaderboard`, `slots`)를 `src/routes/_authenticated/` 하위로 이동(또는 별도 child gate 추가). 공개 라우트(`/`, `/login`, `/signup`, `/reset-password*`, `/auth.callback`, `/play-free`)는 그대로.
- `supabase--configure_auth`: HIBP ON, auto-confirm OFF.
- `supabase--configure_social_auth(providers:["google"])`. `src/features/auth/auth.ts`에 `signInWithGoogle()` 추가 (비파괴, 신규 export만).
- 로그인/회원가입 페이지에 Google 버튼 추가 (`AuthDivider` 아래).
- Stripe: `payments--enable_stripe`, `src/routes/api/public/hooks/stripe.tsx` (서명 검증) → `apply_purchase_credit` 호출. `/account`에 결제 UI.

---

## Phase 7 — RBAC + 관리자 + Rate Limit + 감사

### DB 마이그레이션 #4
- `app_role` ENUM(`admin`, `moderator`, `user`).
- `user_roles(user_id, role)` 테이블 + RLS + `has_role(_uid, _role)` SECURITY DEFINER.
- `audit_events(actor_id, action, target_kind, target_id, payload, created_at)` append-only.
- `rate_limit(p_key text, p_capacity int, p_refill_per_sec numeric)` RPC (token bucket, `rate_limit_buckets` 테이블).
- 민감 RPC(`place_order`, `redeem_*`, `claim_*`) 진입부에 `rate_limit` 호출.
- 관리자 RPC: `admin_settle_leaderboard`, `admin_ban_user`, `admin_review_fraud` — `has_role(auth.uid(), 'admin')` 가드.

### 코드
- `src/routes/_authenticated/admin/*.tsx`: dashboard, fraud review, leaderboard, users. `beforeLoad`에서 `has_role` 체크.
- `src/features/admin/*` UI 컴포넌트.

---

## Phase 8 — 관측성 / PWA / Push / Lighthouse

### 코드
- `src/lib/observability/logger.ts`: 모든 server function 진입/이탈/지속시간/에러 표준 로그.
- `src/routes/api/public/ingest/errors.tsx`: 클라이언트 에러 수집(서명 헤더 + zod). `src/lib/error-capture.ts` 와이어링.
- PWA: `src/shared/lib/pwa/register.ts` 활성화, `manifest.webmanifest` 점검, install/update toast 활성.
- Web Push: VAPID 키 생성 가이드 + `push_subscriptions` 테이블 (마이그레이션 #5에 합치거나 Phase 4와 통합). 알림 권한 UI.
- Lighthouse 95+ 검수: 이미지 lazy, 폰트 preload, critical CSS, route preload.

---

## Phase 9 — 독립화 (Platform-Exit Ready)

### 코드
- `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AI_PROVIDER`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `LOVABLE_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` 전부 명시.
- `src/lib/ai/gateway.ts`: `AI_PROVIDER` env로 Lovable/OpenAI/Gemini 어댑터 분기. 호출부는 `aiChat({model, messages})` 단일 API.
- `supabase/seed.sql`: 초기 quests, leaderboard_period, 샘플 trading_markets, risk_params.
- 마이그레이션 정합 점검 (down 불필요, idempotent guard).
- README: 외부 Supabase 이식 절차 + Cloudflare Workers/Node 배포 절차 + Runbook(롤백/긴급 ban/cron 재실행).
- 법적 템플릿: `/legal/terms`, `/legal/privacy` 라우트 + 마크다운 본문 스켈레톤.
- 최종 리그레션: `vitest run` 100%, `scripts/guards.sh` 16/16 PASS, `supabase--linter` 0 critical, `security--run_security_scan` PASS.

---

## 실행 순서 (한 패스)
```
Step 1  Phase 4 마이그레이션 #1 → 승인 → 실행
Step 2  Phase 4 코드 + 가드 + 테스트
Step 3  Phase 5 마이그레이션 #2 → 승인 → 실행
Step 4  Phase 5 트레이딩 코드/UI/cron
Step 5  Phase 6 마이그레이션 #3 → 승인 → 실행
Step 6  Phase 6 _authenticated 재배치 + Google + Stripe
Step 7  Phase 7 마이그레이션 #4 → 승인 → 실행
Step 8  Phase 7 RBAC/Admin/RateLimit 코드
Step 9  Phase 8 관측성/PWA/Push (push 테이블은 마이그레이션 #5)
Step 10 Phase 9 독립화 + 최종 리그레션 + 통합 보고
```

각 마이그레이션 사이에만 사용자 승인이 필요하며, 코드 작업은 끊지 않고 연속 실행합니다.

## 필요한 시크릿 (시작 시 일괄 요청)
`CRON_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. AI 키는 Lovable AI Gateway 기본 사용으로 생략 가능.

## 리스크 / 결정 필요 사항
1. **트레이딩 가격 소스**: 초기엔 admin RPC + cron 모킹으로 출발, 외부 오라클(예: Binance public WebSocket) 어댑터는 Phase 9 후속 옵션. → 이 플랜은 모킹 시작 가정.
2. **Stripe 결제 활성화**: 실 결제 키가 없으면 Phase 6의 Stripe 부분만 스켈레톤(웹훅 라우트 + RPC)으로 두고 키 입력 시 자동 활성. → 키 없으면 스켈레톤 모드 진행.
3. **`_authenticated` 하위 이동**: 기존 라우트 URL은 변경 없이(`/wallet` 그대로) 파일 위치만 `_authenticated/wallet.tsx`로 이동. 기존 외부 링크 영향 0.
4. **pg_cron `net.http_post`**: `pg_net` extension 활성화 필요 → 마이그레이션 #1에서 `CREATE EXTENSION IF NOT EXISTS pg_net;` 포함.

승인 시 build 모드로 전환하여 위 10단계를 끊지 않고 끝까지 실행합니다.
