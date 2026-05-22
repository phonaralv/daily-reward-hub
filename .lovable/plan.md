# PR-1 Polish — Foundation (Presence-first, Low-end-real)

PHONARA는 2026년 저가 안드로이드에서도 60fps에 가깝게 동작하고,
30년 후에도 기술부채 없이 확장 가능한 글로벌 최고 수준의 모바일 플랫폼이다.
PR-1은 "동작하는 코드"가 아니라 **Foundation**이다.

- Presence는 PHONARA의 정체성. 통계적 진실 + 살아있음의 체감 + 아키텍처 안정성.
- 저사양 대응은 tier enum이 아니라 **RAF/타이머 예산 자체를 줄이는 구조**.
- 지금 안 박아두면 PR-2(트레이딩/지갑/슬롯)에서 무너지는 규칙은 지금 박는다.
- 비즈니스 mutation은 PR-1에서 절대 추가하지 않는다.

진행 원칙: 1단계 끝 → 변경 파일/SHA + guards/lint 결과 보고 → 사용자 승인 → 다음 단계.

---

## 1단계 — Presence: 신뢰성 + 살아있음 + 아키텍처 (최우선, 가장 무겁다)

가드 추가는 부수 작업이다. 1단계의 본질은 **Presence를 공유 clock 위로 재설계**하고,
각 카운터에 **진실 계약(truth contract)** 을 코드 레벨로 박는 것이다.

### 1-A. Presence Truth Contract (코드 + RULES.md)

`src/shared/lib/presence/contracts.ts` 신설:

- 각 presence 표시 요소(online count, countries, region heat, global pulse, ticker)에
  타입화된 계약을 선언: `{ kind, floor, ceiling, maxDeltaPerTick, maxDeltaPerWave,
  canDecrease, biasCategory }`.
- `useLiveCounter`가 contract를 **인자로 강제**받도록 시그니처 변경
  (기존 옵션 백 호환은 contract preset으로 흡수).
- dev 빌드에서 contract 위반(범위 초과, 단조 증가 폭주 등) 시 `console.error` +
  `notify.dev()` (prod 무음). PR-2에서 Sentry로 확장 여지.

`src/shared/lib/presence/RULES.md` 상단에 "Why" 한 문단 +
계약 표(각 kind별 floor/ceiling/허용 변화 범위)를 추가. **숫자가 곧 진실의 경계**임을 명시.

### 1-B. Presence Clock (공유 RAF/타이머 1개)

지금 `useLiveCounter`는 인스턴스마다 `setTimeout` + `requestAnimationFrame` 을 따로 돌린다.
저사양에서 N개 카운터 = N개 타이머 = N개 RAF. 30년 유지보수 관점에서도 잘못됐다.

`src/shared/lib/presence/clock.ts` 신설:

- 앱 전역 단일 scheduler. 200ms tick 해상도 1개 + 단일 RAF loop 1개.
- 컴포넌트는 `subscribe(intervalRange, cb)` / `subscribeAnimation(cb)` 만 한다.
- `document.visibilitychange` 한 곳에서만 듣고 전체 일시정지/재개.
- Page Lifecycle `freeze`/`resume` 이벤트도 같은 게이트로 처리.
- resume 시 누적 시간 보정 없이 "다음 tick부터 자연 재개" (점프 금지).
- stagger: subscribe 시 의사난수 오프셋 부여 → 같은 200ms 프레임에 2개 이상 변경 금지.

`liveEngine.ts`는 이 clock 위에서 동작하도록 **재작성**한다.
외부 API(`useLiveCounter`)는 contract 인자 추가 외 호환 유지.

### 1-C. Reduced motion / 저전력 경로

- `prefers-reduced-motion: reduce` → RAF 경로 자체를 구독하지 않음(스냅 값 직접 set).
- 배터리 측면에서도 RAF가 안 도는 게 핵심. 단순 `easeMs=0`이 아니다.

### 1-D. Presence 진실성 가드 (`scripts/guards.sh`)

- `src/shared/ui/presence/**`, `src/shared/lib/presence/**`에서
  사용자명/금액/출금/수익 정규식 차단:
  `\busername\b|\bwithdrew\b|earned\s*[$₩]|\bKRW\s*\d|\bUSD\s*\d|\bprofit\s*[$₩]`
- 동일 범위에서 `localStorage`, `sessionStorage`, `fetch(`, `XMLHttpRequest`,
  `new WebSocket(` 직접 사용 차단 (데이터는 `useRealtimeChannel` + serverFn 경유만).
- `useLiveCounter` 호출 시 contract 인자 없음 차단 (정규식 + 추후 ESLint로 강화).
- 위반 시 `src/shared/lib/presence/RULES.md` 경로 출력.

### 1단계 산출물 보고

- 변경 파일 목록 + 커밋 SHA
- `bash scripts/guards.sh` + `bun run lint` 결과
- preview에서 다음 4가지 수동 확인 결과 보고:
  1. 탭 숨김 5초 → 복귀 시 카운터 점프 없음
  2. reduced-motion ON → 값이 ease 없이 스냅
  3. 같은 화면 N개 카운터 동시 변동 없음(시각적 stagger)
  4. dev에서 contract floor 위반 console.error 발생(의도적 1회)
- 사용자 승인 후에만 2단계 진행

---

## 2단계 — 저사양 실측 기반 대응 (tier는 도구, 본질은 예산)

목표: **저사양 기기에서 메인 스레드 작업/RAF 호출/네트워크 사용량을 실제로 줄인다.**

### 2-A. `src/shared/lib/perf/deviceTier.ts` (SSR-safe)

- `getDeviceTier(): "low"|"mid"|"high"` 순수 함수, `useDeviceTier()` 훅.
- 신호: `navigator.deviceMemory`, `hardwareConcurrency`, `connection.effectiveType`,
  `connection.saveData`, `matchMedia("(prefers-reduced-data: reduce)")`.
- SSR → `"mid"` 기본값. 마운트 후 1회 계산해 안정값.

### 2-B. 1단계 clock을 tier-aware로

- low: tick 해상도 400ms(2x), RAF subscriber 비활성(스냅 경로 사용),
  wave delta 0.6x, 동시 활성 subscriber 상한(예: 4) — 초과는 가장 오래된 것부터 freeze.
- mid: 현 기본값.
- high: 변동 없음.

### 2-C. PresenceBoundary

`src/shared/ui/presence/PresenceBoundary.tsx`:

- 자식 presence 트리를 감싸고, `tier === "low" && saveData === true` 또는
  `presence_engine_enabled === false` 시 자식을 마운트하지 않음(=구독 0개).
- 라우트 셸에서 presence 영역을 이 boundary로 감싼다.

### 2-D. 관측 가능성 (dev only)

- clock 모듈이 dev에서 분당 tick 수/활성 subscriber 수를 `window.__presence__`에 노출.
- preview에서 확인 후 보고용 수치 캡처.

### 2단계 산출물 보고

- 변경 파일 목록 + SHA, guards/lint
- DevTools CPU 4x throttle + Slow 3G로 강제 low tier 후:
  - 분당 tick 수, 활성 subscriber 수
  - 카운터가 끊김/점프 없이 차분히 도는지
- 사용자 승인 후에만 3단계 진행

---

## 3단계 — 아키텍처 위생 / 기술부채 방지 (PR-2 무너짐 예방)

PR-2에서 트레이딩/지갑/슬롯을 넣을 때 아래가 없으면 무조건 무너진다.

### 3-A. 레이어 경계 강제 (`scripts/guards.sh` + ESLint)

- `src/shared/**` → `src/features/**` / `src/routes/**` import 금지
- `src/shared/lib/presence/**` → `src/shared/lib/presence/**`,
  `src/shared/lib/perf/**`, `src/shared/lib/notify`, `src/shared/config/i18n/**`,
  `src/shared/lib/useRealtimeChannel`, `react`, `framer-motion` 외 import 금지
- `src/integrations/supabase/client.server` → 클라이언트 코드 import 금지 (기존 유지 + ESLint `no-restricted-imports` 보강)
- presence 트리에서 `framer-motion` 사용은 허용하되 `animate` prop만, `motion.*` 컴포넌트 사용 시 PresenceBoundary 안에서만 (eslint custom rule는 PR-2, PR-1은 guards.sh grep으로 워닝만)

### 3-B. 비즈니스 mutation 선제 차단

- `src/shared/**`, `src/routes/**` 에서 `from "@/features/wallet"`,
  `"@/features/missions"`, `"@/features/slots"`, `"@/features/trade"`
  import 시 guards.sh fail (해당 모듈이 아직 없어도 선제적으로 박는다).

### 3-C. PR-1 핵심 규칙 1페이지

`docs/PR1_RULES.md` 신설:

- 디자인 토큰만 사용 (hex/rgb 금지)
- sonner는 `@/shared/lib/notify` 단일 진입점
- `client.server.ts`는 서버 전용
- Presence는 contract 기반 aggregate-only, 공유 clock 위에서만 동작
- 모든 timer/RAF는 clock 모듈 경유, 직접 `setInterval`/`requestAnimationFrame` 금지(presence 범위)
- `src/pages/` 금지
- 비즈니스 mutation은 PR-2부터

### 3단계 산출물 보고

- 변경 파일 목록 + SHA, guards/lint
- 의도적 위반 1건씩으로 각 신규 가드가 실제로 잡는지 sanity check 후 원복 보고
- 사용자 승인 후에만 4단계 진행

---

## 4단계 — README 정확화

### 4-A. DB Migrations 실제 순서로 교체

```text
01_extensions.sql        pgcrypto, citext
02_roles_helpers.sql     app_role enum + user_roles + has_role()
                         (SECURITY DEFINER, SET search_path = public)
03_profiles.sql          profiles + handle uniqueness
04_wallets_ledger.sql    wallet + ledger 스켈레톤 (PR-1은 스키마만)
05_onboarding.sql        가입/활성화 추적 (presence seed 입력원)
06_kill_switches.sql     feature_flags + presence_* 키
                         (presence_engine_enabled,
                          presence_dynamic_updates_enabled,
                          presence_update_intensity,
                          presence_seed_ratio,
                          launch_presence_mode)
07_notifications.sql     notifications + notification_prefs + Realtime
```

모든 테이블 RLS ON, 정책은 `auth.uid()` + `has_role()` 기반.
모든 SECURITY DEFINER 함수는 `SET search_path = public`.

### 4-B. Vision 단락

> PHONARA는 2026년 저가 안드로이드에서도 부드럽게 동작하고,
> 30년 후에도 기술부채 없이 확장 가능한 글로벌 최고 수준의 모바일 플랫폼이다.
> Presence Layer는 통계적 진실만 보여주며, 사용자가 첫 진입부터
> "이미 전 세계에서 살아있는 플랫폼"으로 느끼게 한다.

### 4-C. PR-1 범위 / PR-2 진입 조건

- PR-1: shell, PWA(등록만), Presence(contract+clock), notifications, i18n, 가드/문서
- PR-1 비포함: 지갑 mutation, 미션, 슬롯, 트레이딩, referrals,
  PWA runtime caching(Workbox), Performance Budget 수치 문서화,
  seed-deterministic 초기화, raster import 가드,
  content-visibility/contain CSS
- PR-2 진입: 1~4단계 green + 사용자 합의

---

## PR-1 종료 조건

- 1~4단계 완료
- `bash scripts/guards.sh` + `bun run lint` green
- 저사양 시뮬레이션에서 분당 tick 수/활성 subscriber 수가 합리적 범위
- README가 실제 코드/마이그레이션과 정확히 일치
- "PR-1 끝내도 된다"는 사용자 합의

## 본 PR에서 일부러 하지 않는 것

상세 Performance Budget 수치 문서화, `useLiveCounter` seed-deterministic 초기화,
raster import 차단 가드, `content-visibility`/`contain` CSS,
PWA runtime caching(Workbox), Sentry 연결, presence ESLint custom rule,
비즈니스 도메인 코드, 한 번에 여러 단계 동시 진행.
