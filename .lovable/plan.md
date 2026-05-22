# PR-1 Polish — Foundation, Performance, Presence

PR-1의 목표를 다시 확인하고, 문서 정확성과 저사양 모바일 성능 가드, Presence Layer 신뢰성을 마무리합니다. 비즈니스 로직(지갑/미션/슬롯/트레이드)은 PR-2로 유지합니다.

---

## 1. README.md 정정 (정확성 최우선)

가장 많이 참조될 문서이므로 실제 적용된 내용과 1:1로 맞춥니다.

### DB Migrations 섹션 — 실제 적용 순서로 교체

```text
01_extensions.sql        pgcrypto, citext
02_roles_helpers.sql     app_role enum + user_roles + has_role()  (SECURITY DEFINER, search_path=public)
03_profiles.sql          profiles + handle uniqueness
04_wallets_ledger.sql    wallet + ledger 스켈레톤 (PR-2에서 mutation 추가)
05_onboarding.sql        가입/활성화 추적 (presence seed 입력원)
06_kill_switches.sql     feature_flags + presence_* 키
                         (presence_engine_enabled, presence_dynamic_updates_enabled,
                          presence_update_intensity, presence_seed_ratio,
                          launch_presence_mode)
07_notifications.sql     notifications + notification_prefs + Realtime
```

- 모든 테이블 RLS ON, 정책은 `auth.uid()` + `has_role()` 기반.
- 모든 SECURITY DEFINER 함수는 `SET search_path = public` 명시.
- PR-1은 wallet/ledger 테이블은 만들기만 하고 mutation 없음 — PR-2에서 server fn으로만 접근.

### Stack 섹션 정리

- 현재 표기 정리: "TanStack Start v1 (React 19, Vite 7), Cloudflare Workers SSR, Tailwind v4 (HSL tokens in `src/styles.css`), External Supabase project `edlhlbwojgdnpdjhorpb` (Lovable Cloud 비활성), Zustand + TanStack Query, Framer Motion, Sonner는 `@/shared/lib/notify` 한 곳으로만."
- "Lovable Cloud disabled" 문구가 PR-2 계획과 충돌 없는지 한 줄로 명시.

### 새 섹션 추가

- **Vision & Non-negotiables** (맨 위): "2026년 저가 안드로이드에서 60fps, 30년 유지보수, Stake/Rollbit/Bybit 압도 품질" + Presence Layer 진실성 규칙(`src/shared/lib/presence/RULES.md` 링크).
- **Performance Budget**: JS initial ≤ 180KB gz, LCP ≤ 2.5s on 3G/저사양, route chunk ≤ 60KB gz, presence tick CPU ≤ 1ms/frame, idle 시 setTimeout만 (RAF는 ease 중에만).
- **GitHub Sync Verification**: 작업 후 커밋 확인 절차(아래 §2).

---

## 2. GitHub 반영 신뢰성

작업 직후 다음을 자동 보고:
- 변경된 파일 목록 (이미 보고 중)
- 마지막 커밋 SHA / 메시지가 변경분을 포함하는지 한 줄 확인
- 누락 의심 시 사용자에게 즉시 알림 ("X 파일이 푸시되지 않았을 수 있음 — 확인 부탁")

README의 *Contributing* 하위에 동일 체크리스트 명시.

---

## 3. PR-1 진짜 목표에 맞는 보강 (코드)

비즈니스 로직 없이, **기반/성능/Presence**만 강화합니다.

### 3.1 저사양 모바일 성능 가드

- `src/shared/lib/perf/deviceTier.ts` 신설
  - `deviceMemory`, `hardwareConcurrency`, `connection.effectiveType`, `navigator.userAgent`(저가 Android 힌트)로 `tier: "low" | "mid" | "high"` 산출.
  - SSR-safe (`typeof navigator` 가드).
- `liveEngine.ts`의 `isLowEnd()` → `useDeviceTier()` 로 교체, tier별 tick 간격/이즈 길이/RAF 사용 여부 분기.
  - low: ease 끔(snap), tick 간격 2배, wave 진폭 0.6배.
- `useGlobalPulse`도 동일 tier 반영.
- 새 가드: `prefers-reduced-data` (지원 브라우저) 감지 시 presence intensity 자동 `low`.

### 3.2 Presence Layer 신뢰성

- `RULES.md` 위반 자동 가드 추가 (`scripts/guards.sh`):
  - presence 컴포넌트에서 사용자명/금액/출금 같은 단어 정규식으로 차단 (`username|withdrew|earned\s*\$|\bKRW\s*\d`).
  - presence 컴포넌트가 `localStorage`/`fetch` 직접 호출하지 않는지 체크 (aggregate 전용).
- `useLiveCounter` 결정성: seed가 같으면 첫 1초 동안의 출력이 일관되도록 초기 jitter를 seed 기반 hash로 (SSR/CSR mismatch 방지).
- Realtime: `useRealtimeChannel` 채널 키에 RLS 가시 범위가 섞이지 않는지 주석 + lint 주석 정리.

### 3.3 Route-level 성능

- 모든 `src/routes/*.tsx` 페이지 컴포넌트 lazy 분할은 TanStack가 자동 처리하지만, `__root.tsx`에서 무거운 provider/위젯이 항상 로드되지 않도록 점검.
- `AppShell`에 `content-visibility: auto` + `contain: layout paint` 적용 가능한 영역 표시 (CSS 토큰만).
- 이미지/아이콘: PR-1에는 SVG 인라인만, raster 금지 (가드 추가: `src/**` 안에서 `.png|.jpg` import 차단).

### 3.4 i18n / 접근성 / 안전 기본값

- `<html lang>` 동적 전환 확인 (ko/en).
- `prefers-reduced-motion` + `prefers-reduced-data` 두 가지 모두 presence/animation에 연결.
- Bottom nav / 헤더: 터치 타겟 ≥ 44px 가드 (Tailwind 토큰 점검).

### 3.5 PWA (PR-1 범위 유지)

- SW 등록은 production + non-preview 유지.
- runtime caching은 PR-2.
- 단, manifest `theme_color`/`background_color`가 HSL 토큰과 실제 일치하는지 README에 명시.

---

## 4. PR-2 인입 전 청소

- `src/entities/`, `src/features/` README는 그대로 비워두되, PR-2 진입 시 추가할 첫 entity 목록만 한 줄 메모 추가 (`wallet`, `mission`, `slot`, `referral`, `chest`).
- `.lovable/plan.md`(이 파일)에 PR-2 진입 조건 1줄: "guards.sh + lint + build 3개 모두 green, README §1 정정 완료, deviceTier 적용 확인."

---

## 작업 순서 (한 번에 처리)

1. README.md 전체 재작성 (정확한 마이그레이션, Vision, Performance Budget, GitHub 체크리스트).
2. `scripts/guards.sh`에 presence 진실성 가드 + raster import 가드 추가.
3. `src/shared/lib/perf/deviceTier.ts` 신설 + `liveEngine.ts`/`useGlobalPulse` 연결.
4. `useLiveCounter` seed-deterministic 초기화로 SSR mismatch 제거.
5. `bash scripts/guards.sh` + build 확인 후 변경 파일 + 마지막 커밋 SHA 보고.

PR-2는 이 PR이 모두 green일 때만 시작합니다.
