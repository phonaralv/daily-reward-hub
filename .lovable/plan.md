
# Step A — 로그인 / 회원가입 끝판왕 UI/UX

확정 조건: **flat 라우트** · **비파괴(`auth.ts`/`useAuth.ts`/`auth.types.ts` 시그니처 무변경)** · **실효적 PasswordStrengthMeter** · **프로덕션급 UI/UX** · **종료 후 정형 보고**.

## 사전 확인 (코드베이스 실측)
- `@fingerprintjs/fingerprintjs` 이미 설치 + `useFingerprint()` 이미 `__root.tsx` 마운트됨 → Phase 4의 fpjs 작업은 검증만 남음.
- `src/components/ui/sonner.tsx` 존재하나 `__root.tsx`에 `<Toaster />` 미마운트 → 본 Step에서 마운트.
- `src/routes/auth/callback.tsx` **부재** → 본 Step에서 `src/routes/auth.callback.tsx` (flat → `/auth/callback`) 신규 생성.
- 기존 디자인 토큰은 HSL 기반(`--primary`, `--accent-cyan`, `--accent-pink` 등). 신규 auth 토큰도 HSL로 통일.

## A-1. 디자인 토큰 (`src/styles.css` 말미 추가, 기존 무수정)
- `--auth-glow-cyan/purple/pink/gold` (HSL)
- `--gradient-auth-mesh` (4-stop radial)
- `--shadow-auth-card` (1px inner border + neon halo)
- keyframes: `auth-blob-a/b/c`, `auth-shimmer`, `auth-shake`, `auth-pop`
- utilities: `.auth-shimmer`, `.auth-grid-overlay` (radial mask 페이드 그리드)

## A-2. AuthShell — `src/features/auth/ui/AuthShell.tsx` (신규)
- Layer 1 베이스 background
- Layer 2 3 blob (cyan/purple/pink), `mix-blend-screen`, `blur-3xl`, 18–24s loop
- Layer 3 페이드 그리드(`.auth-grid-overlay`)
- Layer 4 glass card: `backdrop-blur-2xl`, `bg-white/[0.04]`, `border-white/10`, `shadow-[var(--shadow-auth-card)]`
- slots: `brand`, `headline`, `children`, `footer`
- safe-area inset, `prefers-reduced-motion` 대응(CSS @media 단에서 blob 정지)

## A-3. Micro 컴포넌트 (`src/features/auth/ui/`)
- **`NeonInput.tsx`** — floating label, focus 시 cyan→purple gradient ring, `aria-invalid` pink, autofill 색상 무력화, leading icon slot, `aria-describedby` 연결.
- **`NeonButton.tsx`** — variants: `primary`(gradient) / `secondary`(glass) / `ghost`. 상태 4종: idle / loading(shimmer+spinner, `aria-busy`) / success(`auth-pop` 체크) / error(`auth-shake`).
- **`PasswordStrengthMeter.tsx`** — **실효적 검증**:
  - 길이 가산: 8/12/16자 임계.
  - 다양성 가산: 소/대문자/숫자/특수 4종.
  - 감점: 동일문자 3연속, 키보드 시퀀스(`qwerty`/`asdf`/`1234`/`abcd`), top-50 weak dict(`password`, `qwerty123`, `letmein`, `admin`, `iloveyou` 등), 이메일 local-part 포함, 단일 케이스(전소문자/전숫자) 페널티.
  - 점수 0–4 → 5칸 막대 (red→amber→cyan→purple→neon-green), 권고 문구 한국어.
  - 외부 의존 0, 순수 함수 `scorePassword(pwd, {email?})` export.
- **`AuthDivider.tsx`** — "또는" + 좌우 fade rule.
- **`AuthTabs.tsx`** — segmented control (Magic Link / 비밀번호), active indicator slide.

## A-4. `src/features/auth/auth.ts` — **비파괴 확장만**
기존 export(`signIn`, `signUp`, `signOut`, `sendMagicLink`, `getCurrentSession` 등) **시그니처·반환형·이름 일체 무변경**. 추가만:
- `signUpWithPassword({email,password})` → `auth.signUp({ email, password, options: { emailRedirectTo: ${origin}/auth/callback } })`
- `requestPasswordReset(email)` → `auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`
- `updatePassword(newPassword)` → `auth.updateUser({ password })`

`auth.types.ts` / `useAuth.ts`는 **수정 없음**.

## A-5. 라우트
- **`src/routes/login.tsx`** — 재작성: AuthShell + AuthTabs(Magic Link / 비밀번호) + footer 링크(`/signup`, `/reset-password-request`). 기존 `useAuth` 그대로 사용.
- **`src/routes/signup.tsx`** — 신규: AuthTabs + PasswordStrengthMeter + 약관/개인정보 체크. 성공 시 "이메일 확인 안내" 상태.
- **`src/routes/auth.callback.tsx`** — 신규 (`/auth/callback`): `supabase.auth` 세션 이벤트가 자동 처리, 1초 polling 후 세션 있으면 `/`로 navigate, 없으면 에러 메시지 + `/login` 링크.
- **`src/routes/reset-password-request.tsx`** — 신규: 이메일 입력 → `requestPasswordReset` → 발송 안내.
- **`src/routes/reset-password.tsx`** — 신규: 새 비밀번호 입력(메터 포함) → `updatePassword` → `/`.

## A-6. 루트 마운트
- `src/routes/__root.tsx`에 `<Toaster position="top-center" richColors closeButton />` 한 줄 추가 (나머지 변경 0). `useFingerprint`/`useLedgerStream` 등 기존 로직 무변경.

## A-7. 품질 게이트
- 모든 폼: Enter 제출 / ESC 클리어 / `aria-live="polite"` 에러 영역 / `aria-busy` pending / focus visible.
- 360px / 1024px / 1440px 3-breakpoint 시각 검증.
- console error 0, 빌드 PASS, 기존 `scripts/guards.sh` PASS 유지.

## 신규/수정 파일 목록
신규 (10):
- `src/features/auth/ui/AuthShell.tsx`
- `src/features/auth/ui/NeonInput.tsx`
- `src/features/auth/ui/NeonButton.tsx`
- `src/features/auth/ui/PasswordStrengthMeter.tsx`
- `src/features/auth/ui/AuthDivider.tsx`
- `src/features/auth/ui/AuthTabs.tsx`
- `src/routes/signup.tsx`
- `src/routes/auth.callback.tsx`
- `src/routes/reset-password-request.tsx`
- `src/routes/reset-password.tsx`

수정 (3):
- `src/styles.css` (말미 추가)
- `src/routes/__root.tsx` (`<Toaster />` 1줄)
- `src/routes/login.tsx` (재작성, `useAuth` API 사용 무변경)
- `src/features/auth/auth.ts` (3개 함수 **추가만**)

## 비파괴 보증
- `auth.types.ts`, `useAuth.ts` 무수정.
- `auth.ts` 기존 export 무변경 (추가만).
- 기존 라우트(`_authenticated`, `index`, `wallet`, `trade` 등) 무수정.
- DB 변경 0건, RPC 0건, Lovable 전용 SDK 0건 (sonner/supabase-js/tanstack만).

## 종료 보고 포맷 (Step A 완료 시)
1. 변경 파일 목록 (신규/수정)
2. 신규 DB 객체: 없음
3. Guard 규칙: 기존 PASS 유지
4. Lovable 종속성 신규: 없음
5. UI/UX 자가평가 (mesh / glass / 입력 / 버튼 상태 / 메터 / 접근성 / 반응형) ✓△✗
6. 트레이딩 영향: 없음
7. 다음 Phase(B = Phase 4) 진입 전 확인: 마이그레이션 SQL 사전 검토 동의 여부

빌드 모드 전환 시 단일 패스로 위 순서대로 작성합니다.
