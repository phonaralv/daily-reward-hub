# PR-1 Polish — 축소된 안정화 플랜

PR-1을 안전하게 마무리하기 위해 범위를 줄이고 순서를 고정합니다.
비즈니스 로직(지갑/미션/슬롯/트레이드)은 PR-2에서 진행합니다.
상세 Performance Budget 문서화, seed-deterministic 초기화, raster import 가드 등
세부 항목은 본 PR이 안정된 뒤 별도 처리합니다.

---

## 1단계 — README.md 정확히 수정 (최우선)

가장 많이 참조될 문서이므로 실제 적용된 내용과 1:1 정렬.

### DB Migrations 섹션 — 실제 적용 순서로 교체

```text
01_extensions.sql        pgcrypto, citext
02_roles_helpers.sql     app_role enum + user_roles + has_role()
                         (SECURITY DEFINER, SET search_path = public)
03_profiles.sql          profiles + handle uniqueness
04_wallets_ledger.sql    wallet + ledger 스켈레톤 (PR-1은 스키마만, mutation은 PR-2)
05_onboarding.sql        가입/활성화 추적 (presence seed 입력원)
06_kill_switches.sql     feature_flags + presence_* 키
                         (presence_engine_enabled, presence_dynamic_updates_enabled,
                          presence_update_intensity, presence_seed_ratio,
                          launch_presence_mode)
07_notifications.sql     notifications + notification_prefs + Realtime
```

- 모든 테이블 RLS ON, 정책은 `auth.uid()` + `has_role()` 기반.
- 모든 SECURITY DEFINER 함수는 `SET search_path = public` 명시.

### Stack 섹션 일관성 정리

- TanStack Start v1 (React 19, Vite 7), Cloudflare Workers SSR
- Tailwind v4, HSL semantic tokens in `src/styles.css`
- External Supabase project `edlhlbwojgdnpdjhorpb` (Lovable Cloud 비활성)
- Zustand + TanStack Query, Framer Motion
- Sonner는 `@/shared/lib/notify` 단일 진입점

### 짧은 Vision 문구 (한 단락)

"2026년 저가 안드로이드에서도 부드럽게 동작하고, 30년 후에도 유지보수 가능한
글로벌 1위 플랫폼." 자세한 budget 수치 문서화는 안정화 이후로 유예.

---

## 2단계 — Presence Layer 진실성 가드 강화

`scripts/guards.sh`에 RULES.md 위반 자동 차단 추가.

- `src/shared/ui/presence/**`, `src/shared/lib/presence/**`에서
  사용자명/금액/출금 류 단어 차단:
  정규식 예시: `username|withdrew|earned\s*[$₩]|\bKRW\s*\d|\bUSD\s*\d`
- presence 컴포넌트에서 `fetch(`, `localStorage` 직접 호출 차단
  (aggregate 전용, 데이터는 useRealtimeChannel + 서버 fn으로만).
- 위반 시 RULES.md 경로를 함께 출력.

eslint 쪽은 본 단계에서는 손대지 않음 (가드 셸 스크립트로 충분).

---

## 3단계 — 저사양 모바일 기본 대응

작은 단위로 deviceTier만 도입하고 liveEngine에 연결.

- `src/shared/lib/perf/deviceTier.ts` 신설
  - SSR-safe. `navigator.deviceMemory`, `hardwareConcurrency`,
    `connection.effectiveType`로 `tier: "low" | "mid" | "high"` 산출.
  - `prefers-reduced-data` 감지 시 `low`로 강등.
- `liveEngine.ts`의 기존 `isLowEnd()` 분기를 `deviceTier` 결과로 교체:
  - low: ease 끔(snap), tick 간격 2배, wave 진폭 0.6배.
  - mid: 현재 기본값 유지.
  - high: 변화 없음.
- `useGlobalPulse`에서도 tier에 따라 intensity 한 단계 강등 가능.

seed-deterministic 초기화는 본 단계 범위 밖 (후속 작업).

---

## 4단계 — guards.sh + eslint.config.js 최종 검증 + GitHub 반영 확인

- `bash scripts/guards.sh` 5개 + 추가된 presence 가드 모두 green.
- `bun run lint` (eslint.config.js) green.
- TanStack 빌드 산출물에서 routeTree 정상 생성 확인.
- 변경 파일 목록 + 마지막 커밋 SHA / 메시지를 보고에 포함.
- 누락 의심 시 즉시 사용자에게 보고.

---

## PR-2 진입 조건

1단계~4단계가 모두 green이고, README §DB Migrations 섹션이 실제와 일치할 때.

## 본 PR에서 일부러 하지 않는 것 (후속)

- 상세 Performance Budget 수치 문서화 (LCP/JS gz/route chunk 등)
- `useLiveCounter` seed-deterministic 초기화 (SSR mismatch 정밀화)
- raster import (`.png|.jpg`) 차단 가드
- `content-visibility` / `contain` CSS 토큰 적용
- PWA runtime caching (Workbox) — PR-2
