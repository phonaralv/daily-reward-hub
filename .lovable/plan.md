# PR-1 — PHONARA V2 web bootstrap (apps/web)

**Foundation only.** No business logic (missions/trading/slots/viral economy) — those land in PR-2+. Goal: a production-grade mobile-first shell that already *feels* like a serious next-gen global Korean platform — installable, notification-ready, 60fps, ko-first, and **globally alive from second one**.

---

## 1. Supabase 연결 (외부 ref `edlhlbwojgdnpdjhorpb`)

- Lovable Cloud **비활성**. Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, 서버용 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
- `src/integrations/supabase/`: `client.ts`(localStorage), `auth-middleware.ts`, `auth-attacher.ts`, `client.server.ts`(PR-1 import 0건, CI guard), `types.ts`(placeholder).
- `src/start.ts`에 `attachSupabaseAuth`를 기존 `functionMiddleware`에 **append**(기존 middleware 보존).

## 2. 디자인 시스템 (HSL 다크 프리미엄, 모바일 우선)

- HSL 토큰: background/foreground/surface-1~3/primary/primary-glow/accent-pink/accent-cyan/success/warning/danger/reward-glow/muted/border. 하드코딩 hex/rgb는 ESLint 차단.
- 그라디언트: `--gradient-imperial/reward/fomo`. 그림자: `--shadow-glow/card/reward` (GPU-safe, blur 최소).
- 모션: `--ease-spring`, `--dur-fast/base/slow`.
- iOS Safe Area: `--safe-top/bottom/left/right = env(safe-area-inset-*)`.
- iOS Safari viewport 버그: `100dvh` + `-webkit-fill-available` fallback. `useVisualViewport` (키보드 회피).
- Tabular nums 강제: `.font-tabular, [data-numeric] { font-variant-numeric: tabular-nums; }`.
- Reduced Motion: `@media (prefers-reduced-motion: reduce)`로 0.01ms 강제.
- 타이포: Pretendard(KR, `display=swap`) + Space Grotesk(숫자).

## 3. PWA / Installable App (필수)

> Lovable 미리보기는 iframe — Service Worker는 **production + non-preview host에서만** 등록, preview/iframe에서는 자동 unregister.

- `public/manifest.webmanifest`: `display:"standalone"`, `theme_color:"#0B0B0F"`, `background_color:"#0B0B0F"`, `lang:"ko"`, `orientation:"portrait"`, 192/512/maskable 아이콘.
- `__root.tsx` meta: `viewport-fit=cover`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-mobile-web-app-title=Phonara`, `theme-color=#0B0B0F`, apple-touch-icon, apple splash placeholders.
- `vite-plugin-pwa` + Workbox: HTML `NetworkFirst`(3s), 자산 `StaleWhileRevalidate`, `navigateFallbackDenylist:[/^\/api/, /^\/~/]`.
- `src/shared/lib/pwa/register.ts` (iframe/preview guard로 unregister + 캐시 purge).
- `useInstallPrompt()` → custom `InstallSheet` (iOS는 "홈 화면에 추가" 가이드 시트).
- `useUpdateToast()` — 새 SW waiting 시 한국어 토스트 + reload.
- `appinstalled` 이벤트 hook 자리 준비 (welcome reward는 PR-2 RPC).

## 4. 알림 시스템 토대 (Notifications)

스키마/큐/Realtime/i18n까지. 실제 푸시 전송은 PR-9.

DB 마이그레이션 `07_notifications.sql`:
- `notifications(id, user_id, type, key /*i18n*/, params jsonb, read_at, created_at)` + idx
- `notification_preferences(user_id pk, attendance/streak/missions/friends/rewards bool, marketing default false, locale 'ko-KR', timezone 'Asia/Seoul')`
- `push_tokens(user_id, platform, token, last_seen, unique(user_id, token))`
- RLS 본인만, RPC: `mark_notification_read`, `mark_all_read`, `get_unread_count` (SECURITY DEFINER, `SET search_path=public`)

Frontend `src/shared/lib/notifications/`: `useNotifications`, `useUnreadCount`, `toastQueue.ts` (priority queue, cap 5, ko 카피).
Push: `src/shared/lib/push/{permission.ts, registerToken.ts, README.md}` — VAPID 자리(PR-9 secret), iOS Safari Web Push는 standalone PWA 필수 명시.

## 5. **Global-Scale Presence / Worldwide Activity Layer (신규)**

> "이미 전 세계적으로 사용 중인 글로벌 플랫폼" 느낌을 Day 1부터. **fake individual earnings/withdrawal/identity 절대 금지** — aggregate/region pulse만.

### Region 엔진
`src/shared/config/presence/regions.ts` — 10개 시드:
Seoul, Tokyo, Singapore, Bangkok, Los Angeles, New York, London, Berlin, Dubai, São Paulo.
각 region: `{ id, name, nameKo, country, timezone, activeHours:[start,end], activityMultiplier, missionTrendBias, onboardingWaveStrength }`.

### Wave 엔진
`src/shared/lib/presence/waveEngine.ts`:
- 시간대 기반 가중치 — Asia prime / NA evening / EU lunch surge
- `useActiveRegions()` — 현재 시각 KST 기준 rotate (3~5개 hot region)
- `useGlobalPulse()` — 글로벌 합산 모멘텀 (low / steady / surging / global_surge)
- 데이터 소스 우선순위: **real aggregate events > seed waves**. `launch_presence_mode` 플래그 ON 시 seed 비중 ↑, 실유저 증가 시 자동 ↓ (kill switch `presence_seed_ratio`로 0~100 제어).

### i18n 카피 키 (`src/shared/config/i18n/ko.ts`)
```
'presence.region.active': '{cityKo} 지금 활발해요 🔥',
'presence.region.rising': '{cityKo} 참여가 늘고 있어요',
'presence.reward.waveOpened': '새 리워드 웨이브가 방금 열렸어요',
'presence.countries.joining': '{count}개국에서 참여 중',
'presence.mission.tonightSurge': '오늘 밤 미션 트래픽이 급상승 중',
'presence.global.spike': '글로벌 활동 급증 감지',
'presence.streak.surge': '연속 출석 도전이 폭발 중',
'presence.install.global': '전 세계에서 설치가 계속되고 있어요',
```
ko 기본 + 글로벌 도시명 자연스럽게 혼합(예: "Tokyo · 도쿄 지금 활발해요 🔥").

### Dynamic Presence Timing Engine (신규 — 정적 숫자 금지)

`src/shared/lib/presence/liveEngine.ts`:
- `useLiveCounter(seed, { minDelta, maxDelta, intervalMs:[2000,8000], waveMs:[30000,90000] })` — rAF easing + `setTimeout` 랜덤 interval. 증가만 X, 미세 감소도 허용. 동시 변경 방지(컴포넌트별 jitter offset).
- 시간대 multiplier(`getTimeMultiplier(now)`): Asia prime → onboarding/activity ↑, NA evening → trade/reward ↑, KST 새벽 → low/steady.
- Visibility/Perf: `document.hidden` → 일시정지 + 재개 시 fast-forward, `requestIdleCallback` 우선, 저사양(navigator.deviceMemory ≤ 2 or hardwareConcurrency ≤ 4) → interval ×2, reduced-motion → 즉시 점프(easing 없음).
- Kill switch 연동: `presence_dynamic_updates_enabled` OFF → seed 정지값 유지, `presence_update_intensity` (low/normal/launch/viral)로 delta·interval 스케일.
- 동시 변경 금지: 글로벌 `useLiveScheduler`가 컴포넌트들의 다음 tick을 분산(스큐 ±400ms).

**적용 대상**: `LiveOnboardingCounter`, `ActiveCountriesIndicator`, `RewardWaveBanner`(텍스트 rotate), `MissionActivityPulse`, `WorldwideTicker` 메시지 rotate.

**규칙**: 매초 변경 금지 / 동일 패턴 반복 금지 / 큰 점프 금지 / 모든 변경은 easing.

### UI 컴포넌트 (`src/shared/ui/presence/`)
- `WorldwideTicker.tsx` — region/reward/mission/streak rotate marquee (GPU transform-only, reduced-motion 시 fade rotate)
- `RegionHeatBadge.tsx` — pulse dot + KR/원어 도시명
- `GlobalPulseChip.tsx` — "HOT NOW / TRENDING / GLOBAL SURGE / LIMITED WAVE"
- `LiveOnboardingCounter.tsx` — aggregate `count` 카운트업(tabular-nums)
- `ActiveCountriesIndicator.tsx` — "42개국 참여 중" (real countries set)
- `WorldActivityMapPlaceholder.tsx` — 도트 맵 placeholder(SVG, PR-3 실데이터 결선)
- `OnlinePulseDot.tsx`, `TrendingMissionPulse.tsx`, `RewardWaveBanner.tsx`

홈/미션/리워드 영역에 배치. **빈 화면 절대 금지** — 모든 라우트가 placeholder가 아닌 살아있는 presence로 채워짐.

### 규칙 (CI/README 명문화)
- ❌ 개인 수익/출금/유저 이름 fake 금지 (`src/shared/lib/presence/RULES.md`)
- ✅ aggregate count / region pulse / trend bias만 노출
- ✅ kill switch `presence_engine_enabled`로 즉시 OFF 가능
- `scripts/guards.sh`에 fake earning 패턴 grep (`mockUser|fakeWithdrawal|fakeEarnings`) → exit 1

## 6. 라우트 셸 (8개)

`src/routes/`: index, missions, play-free, wallet, trade, slots, refer, account.
- 고유 `head()`(ko title/description/og), leaf canonical
- 셸 = SafeArea + AppHeader + Content + BottomNav + **WorldwideTicker(상단)** + **GlobalPulseChip(헤더)**
- "PR-N 구현" 라벨 + 살아있는 스켈레톤 + presence 위젯 → 빈 화면 0
- `__root.tsx`: `<html lang="ko" className="dark">`, `QueryClientProvider`, `onAuthStateChange` → invalidate, PWA register(가드), Framer Motion 라우트 전환(GPU, reduced-motion 안전)
- Route-level lazy: `trade.lazy.tsx`, `slots.lazy.tsx`. `vite.config.ts` `manualChunks`: charts/framer-motion/slots 격리. `chunkSizeWarningLimit: 180`.

## 7. 모바일 성능 Hard Rules

- ✅ GPU transform/opacity only — top/left/width/height 애니메이션 ESLint warn
- ✅ `backdrop-filter` 최대 1곳 + `will-change`
- ✅ box-shadow blur >24px 금지(lint warn)
- ✅ `<img loading="lazy">` + 명시 width/height (CLS=0)
- ✅ realtime: `useRealtimeChannel`만 (refcount + 200ms throttle + hidden pause)
- ✅ 리스트 50+ 가상화 노트 (PR-2 `@tanstack/react-virtual`)
- ✅ `useReducedMotionSafe()` 가드 (confetti/marquee/particle)
- ✅ `touch-action: manipulation`
- ✅ Android 저사양: `content-visibility: auto`
- 번들 예산 CI: `scripts/check-bundle.sh` — index gzip ≤180KB
- **목표**: 홈 TTI ≤2.5s, LCP <2.0s, INP <200ms, CLS <0.05

## 8. TanStack Query 정책

`getRouter` per-request:
```ts
new QueryClient({ defaultOptions: {
  queries: { staleTime: 10_000, gcTime: 5*60_000, retry: 1,
             refetchOnWindowFocus: false, refetchOnReconnect: 'always' },
  mutations: { retry: 0 },
}})
```
`defaultPreloadStaleTime: 0` 유지.

## 9. 공유 인프라 (FSD)

```
src/shared/
  lib/
    notify.ts                       # sonner wrapper (외부 sonner 금지)
    useRealtimeChannel.ts           # 단일 매니저 (scope+key, refcount, throttle)
    format.ts                       # PHON, KR compact (12.4만/3.2억), useCountUp
    useReducedMotionSafe.ts
    useVisualViewport.ts
    pwa/{register.ts, useInstallPrompt.ts, useUpdateToast.ts, InstallSheet.tsx}
    notifications/{useNotifications.ts, useUnreadCount.ts, toastQueue.ts}
    push/{permission.ts, registerToken.ts, README.md}
    presence/{waveEngine.ts, useActiveRegions.ts, useGlobalPulse.ts, types.ts, RULES.md}
  ui/
    SafeArea, AppHeader, BottomNav, BottomSheet, Skeleton,
    PhonAmount, RewardToast, CountdownBadge, StreakIndicator,
    presence/{WorldwideTicker, RegionHeatBadge, GlobalPulseChip,
              LiveOnboardingCounter, ActiveCountriesIndicator,
              WorldActivityMapPlaceholder, OnlinePulseDot,
              TrendingMissionPulse, RewardWaveBanner}
  hooks/.gitkeep
  config/
    i18n/{index.ts, ko.ts, en.ts}
    locale.ts                       # KST 기본, Intl.NumberFormat 헬퍼
    presence/regions.ts
src/entities/.gitkeep
src/features/.gitkeep
```

### 강제 규칙 (ESLint + `scripts/guards.sh`)
- `sonner` 직접 import → notify.ts 외 차단
- `supabase.channel(` → useRealtimeChannel.ts 외 차단
- `src/pages/` 디렉터리 금지
- presence fake earnings 패턴 차단
- 구 ref `ketlqzfaplppmupaiwft`, legacy prefix `imperial_|empire_|vip_|crown_|whale_` 차단
- `@/integrations/supabase/client.server` import 0건(PR-1)

## 10. i18n / Korean-first + Global-ready

- 기본 `ko-KR`, TZ `Asia/Seoul`.
- 모든 카피 i18n key, `ko.ts` source of truth, `en.ts` 동일 키 placeholder.
- 숫자: `Intl.NumberFormat('ko-KR')` + tabular-nums. `formatPhon`, `formatKRCompact`.
- 톤: 친근·즉시 보상·살아있음. 글로벌 도시명/국가명 자연 혼합.
- 라우트 `head()` ko 우선, `og:locale=ko_KR`.

## 11. DB 마이그레이션 01~07

`supabase/migrations/` — 사용자가 외부 Supabase에 적용:
- **01_extensions** — `pgcrypto`, `pg_cron`, `pg_net`
- **02_roles_helpers** — `app_role`(admin/user/influencer), `user_roles`+RLS, `has_role()`
- **03_profiles** — `profiles`(referral_code nanoid8, tier, device_fingerprint, locale, timezone) + `on_auth_user_created` trigger
- **04_wallets_ledger** — `wallets`, append-only `ledger`, `_apply_ledger()`
- **05_onboarding** — `onboarding_progress` + `complete_onboarding_step()`(welcome 15,000 PHON 멱등), `app_install` step 예약
- **06_kill_switches** — 11키 seed + `get_kill_switch()` (presence 키 포함: `presence_engine_enabled`, `presence_seed_ratio`, `launch_presence_mode`)
- **07_notifications** — notifications/preferences/push_tokens + RLS + RPC

전 테이블 RLS ON. 모든 RPC `SECURITY DEFINER SET search_path=public`.

## 12. CI / 가드 / 의존성

- `scripts/guards.sh` — 위 모든 grep 가드
- `scripts/check-bundle.sh` — gzip 게이트
- `eslint.config.js` — `no-restricted-imports`(sonner), `no-restricted-syntax`(hex/rgb 리터럴, supabase.channel)
- Husky `pre-commit`: `bun run lint && bun run lint:guards`
- 추가 deps: `nanoid canvas-confetti qrcode.react zustand` / dev: `dependency-cruiser husky vite-plugin-pwa workbox-window`

## 13. README

외부 Supabase 절차, secrets, PWA 정책(iframe SW off), 알림 i18n key 규약, **presence RULES (no fake) 명문화**, 라우트 맵, PR-2~10 로드맵.

---

## 검수 체크리스트 (PR-1 종료 조건)

- [ ] 8개 라우트 모바일 로드 + 고유 `head()` + leaf canonical
- [ ] iPhone BottomNav 0겹침, status bar black-translucent
- [ ] "홈 화면에 추가" → standalone 실행 OK
- [ ] preview/iframe에서 SW 자동 unregister, production에서만 등록
- [ ] `beforeinstallprompt` → custom InstallSheet
- [ ] 새 빌드 배포 시 `useUpdateToast` 한국어 토스트
- [ ] `prefers-reduced-motion` ON → ticker/marquee/confetti 스킵
- [ ] WorldwideTicker가 region rotate (Seoul/Tokyo/NY 등) 동작
- [ ] GlobalPulseChip이 시간대별 상태 변경 (Asia prime/NA evening)
- [ ] LiveOnboardingCounter aggregate 카운트업(tabular-nums)
- [ ] presence RULES.md 존재 + guards.sh fake earning grep 통과
- [ ] iOS Safari 키보드 input 가림 0
- [ ] `useNotifications` 더미에서 unread/realtime 동작
- [ ] `rg 'supabase\.channel\(' src` = 1건(useRealtimeChannel.ts)
- [ ] `rg 'client\.server' src` = 정의 파일만
- [ ] anon 키 `auth.getSession` 200
- [ ] DB 01~07 외부 Supabase 적용, kill_switches presence 키 seed
- [ ] `bun run build`: trade/slots 별도 chunk, index gzip ≤180KB
- [ ] Lighthouse mobile(/): TTI ≤2.5s, LCP <2.0s, INP <200ms, CLS <0.05
- [ ] `bash scripts/guards.sh` exit 0

## 승인 후 즉시 액션

1. `secrets--add_secret` → `VITE_SUPABASE_ANON_KEY` 요청
2. 파일 일괄 생성(병렬) + 의존성 설치(vite-plugin-pwa 포함)
3. 마이그레이션 01~07 SQL 작성 → 외부 Supabase 적용 가이드 출력
4. 빌드 + gzip 측정 + 가드 스크립트 실행
5. PR-2 plan은 다음 턴에 별도 제시
