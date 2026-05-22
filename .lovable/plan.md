# PR-1 Polish — PHONARA Foundation Reset

이전 PR-1 Polish 플랜은 폐기한다. 새 기준은 “안전한 기반”이 아니라
**Presence-first, low-end-real, PR-2-safe Foundation**이다.

PR-1의 성공 기준은 기능 수가 아니다.
첫 진입자가 PHONARA를 “이미 전 세계에서 살아 움직이는 플랫폼”으로 느끼고,
2026년 저가 안드로이드에서도 그 느낌이 끊기지 않으며,
PR-2에서 트레이딩/지갑/슬롯을 얹어도 무너지지 않는 구조를 만드는 것이다.

진행 규칙:
- 한 단계만 진행한다.
- 단계 완료 후 변경 파일, 마지막 커밋 SHA, guards/lint, 검증 결과를 보고한다.
- 사용자 승인 전 다음 단계로 넘어가지 않는다.
- PR-1에서 비즈니스 mutation은 절대 추가하지 않는다.

---

## 0단계 — 현재 Presence 신뢰성 결함 즉시 고정

현재 preview에 SSR hydration mismatch가 있다.
예: 서버는 Berlin, 클라이언트는 London을 렌더링한다.
이 상태에서는 “살아있음”이 아니라 “불안정함”을 느끼게 하므로 PR-1 첫 작업으로 처리한다.

목표:
- SSR/CSR 첫 렌더가 같은 region/pulse/ticker 상태를 렌더링한다.
- `Math.random()`, `Date.now()`, locale/timezone 차이로 첫 화면 텍스트가 바뀌지 않게 한다.
- mounted 이후에만 live variation이 시작된다.

산출물:
- hydration mismatch 제거 확인
- 변경 파일 목록, SHA, guards/lint 결과
- 승인 후 1단계 진행

---

## 1단계 — Presence Experience System

Presence를 개별 컴포넌트 묶음이 아니라 하나의 경험 시스템으로 만든다.
가드는 마지막 방어선이고, 핵심은 **신뢰 가능한 aggregate 서사 + 안정적인 변화 리듬 + 일관된 SSR 초기 상태**다.

### 1-A. Presence Manifest

`src/shared/lib/presence/manifest.ts`를 만든다.
모든 presence 표시는 manifest에 등록된 항목만 사용한다.

각 항목은 다음을 가진다:
- 목적: online count, active countries, region heat, global pulse, ticker
- 표시 문구 범위: 개인 이름/개인 수익/출금 금지
- floor/ceiling: 숫자의 현실성 경계
- tick delta/wave delta: 변화 폭의 경계
- canDecrease: 단조 증가 금지 여부
- firstPaintValue: SSR/CSR 동일 초기값
- emotionalRole: “활발함”, “글로벌감”, “안정감” 중 무엇을 전달하는지

효과:
- Presence가 “랜덤 숫자”가 아니라 제품 언어와 신뢰 경계를 가진 시스템이 된다.
- PR-2에서 실제 aggregate 이벤트가 들어와도 같은 manifest로 흡수 가능하다.

### 1-B. Deterministic First Paint

첫 렌더는 seed 기반 deterministic 값만 사용한다.
mounted 이후 live engine이 움직인다.

- region 선택, ticker 문구, 초기 counter jitter는 seed hash로 결정
- 브라우저 시간/랜덤/locale 차이가 SSR 텍스트에 직접 들어가지 않게 차단
- `useEffect` 이후에만 시간대 bias와 wave를 적용

### 1-C. Presence Rhythm

사용자는 “숫자가 움직인다”가 아니라 “세계가 움직인다”를 느껴야 한다.

- 모든 카운터가 같은 순간 움직이지 않도록 stagger를 manifest 기반으로 고정
- region heat, countries, online count가 서로 모순되지 않게 변화 폭을 제한
- hidden tab 복귀 시 누적 변화 반영 금지: 다음 tick부터 자연 재개
- reduced-motion에서는 움직임을 없애되 정보는 유지

### 1-D. Truth Guard

`scripts/guards.sh`에 presence 전용 가드를 추가한다.

차단 범위:
- `src/shared/ui/presence/**`
- `src/shared/lib/presence/**`

차단 패턴:
- 사용자명/개인 식별: `username`, `userName`, `avatar`, `testimonial`
- 개인 수익/출금: `withdrew`, `withdrawal`, `earned $`, `profit $`, `KRW 123`, `USD 123`
- 직접 데이터 조작: `localStorage`, `sessionStorage`, `fetch(`, `XMLHttpRequest`, `new WebSocket(`
- manifest 밖에서 임의 presence 숫자 생성

위반 시 `src/shared/lib/presence/RULES.md` 경로를 함께 출력한다.

### 1-E. Presence Rules 문서

`RULES.md`를 단순 금지 목록에서 “Presence Philosophy + Contract” 문서로 바꾼다.

포함 내용:
- Presence는 통계적 진실만 보여준다.
- 살아있음은 가짜 개인이 아니라 전 지구적 흐름에서 나온다.
- 숫자 변화는 현실성 경계 안에서만 움직인다.
- kill switch가 있으면 즉시 정지 가능해야 한다.

검증:
- hydration mismatch 없음
- hidden tab 복귀 시 점프 없음
- reduced-motion에서 snap
- guards/lint green
- 승인 후 2단계 진행

---

## 2단계 — Low-end Runtime Budget

저사양 대응은 deviceTier 이름표가 아니다.
목표는 presence가 사용하는 **타이머 수, RAF 수, 동시 업데이트 수, 메인 스레드 작업량**을 줄이는 것이다.

### 2-A. Device Tier

`src/shared/lib/perf/deviceTier.ts` 신설:
- SSR 기본값: mid
- low 조건: deviceMemory <= 2, hardwareConcurrency <= 4, slow-2g/2g/3g,
  saveData, prefers-reduced-data
- high 조건: 충분한 memory/cores + 빠른 네트워크
- `getDeviceTier()`, `useDeviceTier()` 제공

### 2-B. Presence Runtime Budget

presence runtime에 tier별 예산을 둔다.

```text
low  : RAF 0 or 1, tick >= 400ms, active live counters <= 4, wave scale 0.6
mid  : RAF 1,      tick >= 250ms, active live counters <= 8, wave scale 1.0
high : RAF 1,      tick >= 200ms, active live counters <= 12, wave scale 1.0
```

적용 방식:
- low tier에서는 easing보다 snap을 우선한다.
- 화면 밖/비가시 presence는 업데이트하지 않는다.
- 동시에 많은 presence 요소가 있으면 우선순위를 둔다:
  1. global pulse
  2. main online counter
  3. region heat
  4. secondary ticker

### 2-C. Observability

dev에서만 `window.__phonaraPresence`를 노출한다.

확인 가능한 값:
- active subscribers
- ticks per minute
- animation frames per minute
- current tier
- hidden/reduced-motion/saveData 상태

검증:
- CPU throttle + Slow 3G에서 subscriber/tick/RAF 수 보고
- 카운터가 끊기거나 폭주하지 않는지 preview 확인
- guards/lint green
- 승인 후 3단계 진행

---

## 3단계 — PR-2 방어 아키텍처

PR-2에서 트레이딩, 지갑, 슬롯이 들어오면 복잡도는 급증한다.
PR-1에서 다음 경계를 코드와 문서로 고정한다.

### 3-A. Dependency Direction

가드/ESLint로 확인:
- `src/shared/**`는 `src/features/**`, `src/routes/**`를 import하지 않는다.
- `src/shared/lib/presence/**`는 presence/perf/config/notify/useRealtimeChannel 외 도메인 import 금지.
- `client.server.ts`는 서버 전용. 클라이언트 import 금지.
- `sonner`는 `@/shared/lib/notify`만 사용.
- `src/pages/` 금지.

### 3-B. Business Mutation Fence

PR-1에서 다음을 금지한다:
- wallet/trade/slot/mission mutation
- fake balance, fake reward, fake trade event
- client-side admin/role 판단
- localStorage 기반 권한/경제 상태

### 3-C. PR-1 Rules 문서

`docs/PR1_RULES.md` 1페이지 작성:
- Foundation의 목적
- Presence contract/manifest 원칙
- Low-end runtime budget 원칙
- 데이터/권한/서버 경계
- PR-2 전까지 금지되는 작업

검증:
- guards/lint green
- 의도적 위반 sanity check 후 원복
- 승인 후 4단계 진행

---

## 4단계 — README 정확화

README는 마지막에 실제 코드와 맞춘다.

수정 내용:
- Vision 한 단락
- PR-1 범위와 비범위
- 실제 DB migration 순서

```text
01_extensions.sql        pgcrypto, citext
02_roles_helpers.sql     app_role enum + user_roles + has_role()
                         SECURITY DEFINER + SET search_path = public
03_profiles.sql          profiles + handle uniqueness
04_wallets_ledger.sql    wallet + ledger schema only
05_onboarding.sql        onboarding / activation tracking
06_kill_switches.sql     feature_flags + presence_* keys
07_notifications.sql     notifications + notification_prefs + Realtime
```

명시:
- 모든 테이블 RLS ON
- 정책은 `auth.uid()` + `has_role()` 기반
- 중요한 함수는 SECURITY DEFINER + `SET search_path = public`
- PR-2 진입 조건: 0~4단계 green + 사용자 합의

검증:
- README와 실제 코드/마이그레이션 설명 일치
- guards/lint green
- PR-1 종료 여부 사용자 확인

---

## 이번 PR에서 하지 않는 것

- 상세 Performance Budget 수치 문서화
- Workbox/PWA runtime caching
- raster image import guard
- content-visibility / contain CSS
- 트레이딩/지갑/미션/슬롯/referral business logic
- fake 개인 이벤트
- Sentry/analytics 연결
- 대규모 디자인 리뉴얼

---

## PR-1 종료 조건

- hydration mismatch 없음
- Presence manifest 기반, aggregate-only, deterministic first paint
- 저사양 모드에서 runtime budget이 실제로 낮아짐
- guards/lint green
- README가 실제 상태와 일치
- 사용자와 “PR-1 종료 가능” 합의