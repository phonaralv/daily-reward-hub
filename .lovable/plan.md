# PR-1 Polish — 지존급 안정화 플랜

PHONARA는 2026년 저가 안드로이드에서도 부드럽게 동작하고,
30년 후에도 기술부채 없이 확장 가능한 글로벌 최고 수준의 모바일 플랫폼이다.
PR-1은 "동작하는 코드"가 아니라, **저사양에서도 부드럽고,
Presence Layer가 살아있어 첫 진입부터 "이미 전 세계에서 쓰는 진짜 플랫폼"으로
느껴지게 만드는 단계**다.

비즈니스 로직(트레이딩, 지갑 mutation, 미션, 슬롯 등)은 PR-2부터.
PR-1에서는 절대 손대지 않는다.

진행 방식: **한 단계가 끝나면 반드시 보고 → 사용자 승인 후 다음 단계.**
한 번에 여러 단계 동시 진행 금지.

---

## 1단계 — Presence Layer 신뢰성과 체감 품질 (최우선)

Presence는 PR-1에서 PHONARA의 정체성을 결정한다.
fake data 방지를 넘어, 사용자가 믿고 몰입할 수 있는 수준까지 만든다.

### 1-A. `scripts/guards.sh`에 Presence 진실성 가드 추가

- `src/shared/ui/presence/**`, `src/shared/lib/presence/**` 범위에서
  사용자명/금액/출금/수익 패턴 차단:
  - 정규식 예시: `\busername\b|\bwithdrew\b|\bearned\s*[$₩]|\bKRW\s*\d|\bUSD\s*\d|\bprofit\s*\$`
- presence 컴포넌트/훅에서 직접 데이터 조작 차단:
  - `localStorage`, `sessionStorage`, `fetch(`, `XMLHttpRequest` 직접 호출 금지
  - 데이터는 `useRealtimeChannel` + serverFn 경유만 허용
- 위반 시 RULES.md 경로(`src/shared/lib/presence/RULES.md`)를 함께 출력해
  왜 막혔는지 즉시 알게 한다.

### 1-B. hidden tab → resume / reduced-motion 동작 점검

- `document.visibilitychange` 시 `useLiveCounter`의 타이머가 중단되고,
  resume 시 부자연스러운 점프 없이 다음 tick부터 자연스럽게 재개되는지 확인.
- `prefers-reduced-motion: reduce` 환경에서 ease 없이 snap 적용되는지 확인.
- 점검은 코드 read + 콘솔에서 수동 확인. 본 단계에서는 수정 최소화
  (필요 시 1줄 수준 버그 픽스만 허용, 큰 리팩토링은 하지 않음).

### 1-C. Presence 방향성 1페이지 정리

`src/shared/lib/presence/RULES.md` 상단에 짧은 "Why" 문단 추가:

- Presence는 통계적 진실(aggregate truth)만 보여준다.
- 개인 식별/수익 위조 금지. kill switch로 즉시 OFF 가능.
- 사용자가 느끼는 "살아있음"이 가짜 인물이 아니라 **전 지구적 흐름**에서 와야 한다.

### 1단계 산출물 보고

- 변경 파일 목록 + 커밋 SHA
- `bash scripts/guards.sh` 결과 (기존 5개 + 신규 presence 가드)
- `bun run lint` 결과
- 사용자 승인 후에만 2단계 진행

---

## 2단계 — 저사양 모바일 성능의 최소 기반

tier 분류 + liveEngine 최소 분기까지만. 깊은 연결은 하지 않는다.

### 2-A. `src/shared/lib/perf/deviceTier.ts` 신설 (SSR-safe)

- `getDeviceTier(): "low" | "mid" | "high"` 순수 함수
  - SSR(`typeof navigator === "undefined"`) → `"mid"` 기본값
  - `navigator.deviceMemory <= 2` 또는 `hardwareConcurrency <= 4` → `low`
  - `connection.effectiveType` ∈ {`slow-2g`,`2g`,`3g`} → `low`로 강등
  - `matchMedia("(prefers-reduced-data: reduce)")` true → `low`로 강등
  - 그 외 `deviceMemory >= 8` && `hardwareConcurrency >= 8` → `high`
- `useDeviceTier()` 훅 export (마운트 후 1회 계산, 안정값 반환)

### 2-B. `liveEngine.ts` 최소 분기 적용

기존 `isLowEnd()`를 `getDeviceTier() === "low"`로 교체하는 정도의 최소 작업만.

- low tier: tick 간격 2x, easing duration 0 (snap), wave delta 0.6x
- mid/high: 현재 기본값 유지
- `useGlobalPulse`는 이 단계에서 건드리지 않음

깊은 최적화(intensity 강등 연계, seed-deterministic 초기화 등)는 본 PR 밖.

### 2단계 산출물 보고

- 변경 파일 목록 + 커밋 SHA
- guards / lint 결과
- 저사양 모드 강제(예: DevTools CPU 4x throttle + Slow 3G)에서
  카운터가 끊김/점프 없이 차분히 도는지 콘솔/preview로 확인 보고
- 사용자 승인 후에만 3단계 진행

---

## 3단계 — 아키텍처 위생과 기술부채 방지

### 3-A. `scripts/guards.sh` + `eslint.config.js` 최종 검증

- 기존 5개 가드 + 1단계에서 추가된 presence 가드 모두 green
- `bun run lint` green
- `eslint.config.js`의 sonner/`client.server.ts`/hex 규칙이
  실제로 위반을 잡는지 의도적 위반 1건으로 sanity check 후 원복

### 3-B. 모듈 의존성 방향 간단 확인

- `src/shared/**`가 `src/routes/**`나 `src/features/**`를 import하지 않는지 grep
- `src/integrations/supabase/client.server.ts`가 클라이언트 코드에서
  import되지 않는지 재확인 (가드와 별개로 수동 확인)

### 3-C. PR-1 핵심 규칙 1페이지 정리

`docs/PR1_RULES.md` 신설 (1페이지, 글머리표 중심):

- 디자인 토큰만 사용 (hex/rgb 직접 금지)
- sonner는 `@/shared/lib/notify` 단일 진입점
- `client.server.ts`는 서버 전용
- presence는 aggregate-only, 개인 식별 금지
- `src/pages/` 금지, 라우팅은 `src/routes/`
- 비즈니스 mutation은 PR-2부터

### 3단계 산출물 보고

- 변경 파일 목록 + 커밋 SHA
- guards / lint 결과
- 사용자 승인 후에만 4단계 진행

---

## 4단계 — 문서 정확성 (README)

### 4-A. DB Migrations 섹션 정확화

실제 적용 순서로 교체:

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

- 모든 테이블 RLS ON, 정책은 `auth.uid()` + `has_role()` 기반
- 모든 SECURITY DEFINER 함수는 `SET search_path = public` 명시

### 4-B. Vision 문단 명확화

루트 README 상단에 한 단락:

> PHONARA는 2026년 저가 안드로이드에서도 60fps에 가깝게 부드럽게 동작하고,
> 30년 후에도 기술부채 없이 확장 가능한 글로벌 최고 수준의 모바일 플랫폼이다.
> Presence Layer는 통계적 진실만 보여주며, 사용자가 첫 진입부터
> "이미 전 세계에서 살아있는 플랫폼"으로 느끼게 한다.

### 4-C. PR-1 범위 / PR-2 진입 조건 명시

- PR-1: shell, PWA(등록만), presence engine, notifications, i18n, 가드/문서
- PR-1에서 하지 않는 것: 지갑 mutation, 미션, 슬롯, 트레이딩, referrals,
  PWA runtime caching(Workbox), Performance Budget 수치 문서화,
  seed-deterministic 초기화, raster import 가드,
  content-visibility/contain CSS, liveEngine ↔ deviceTier 깊은 연결
- PR-2 진입 조건: 본 PR 1~4단계 모두 green + 사용자 합의

### 4단계 산출물 보고

- 변경 파일 목록 + 커밋 SHA
- guards / lint 결과
- "PR-1 종료해도 되는지" 사용자 확인

---

## PR-1 종료 조건 (지존급)

- 1~4단계 모두 완료
- `bash scripts/guards.sh` + `bun run lint` 모두 green
- 저사양 시뮬레이션에서도 presence가 최소한의 신뢰성/체감 품질 확보
- README가 실제 코드/마이그레이션과 정확히 일치
- "이 정도면 PR-1을 끝내도 된다"는 사용자와의 합의

## 본 PR에서 일부러 하지 않는 것 (후속)

상세 Performance Budget 수치 문서화, `useLiveCounter` seed-deterministic 초기화,
raster import 차단 가드, `content-visibility`/`contain` CSS,
PWA runtime caching(Workbox), liveEngine ↔ deviceTier 깊은 연결,
한 번에 여러 단계 동시 진행.
