# PR-1 Step 0 보정 — Build Mode 실행 계획

## 목표

0단계를 "진짜로" 완료한다. 표면적 수정이 아닌 검증 가능한 산출물로 마감한다.

## 작업 순서

### 1. `src/shared/lib/presence/waveEngine.ts` 재작성

- `PRESENCE_FIRST_PAINT_SEED = "phonara-pr1-presence-v1"` 상수 export
- `PRESENCE_FIRST_LIVE_DELAY_MS = 1200` 상수 export
- `stablePresenceHash(input)`: FNV-1a 32-bit, `Math.imul` 사용, 외부 의존성 0
- `getDeterministicRegions(count, seed)`: 순수 함수. `seed:region.id` 해시 + declaration order tiebreaker
- `useActiveRegions(count, opts?)`:
  - 첫 render는 `getDeterministicRegions` 결과만 반환 (SSR/CSR 동일)
  - `useEffect`에서 `Math.max(1200, opts.firstLiveDelayMs ?? 1200)` 후에만 live recompute 시작
  - 이후 45s 간격 갱신

### 2. `scripts/aliveness-check.mjs` 재작성

- `playwright` import → `puppeteer-core` import
- 시스템 `/bin/chromium`을 `executablePath`로 직접 지정
- `--no-sandbox --disable-setuid-sandbox` 플래그
- 기존 정규식 `extractFromHtml` 함수 **완전 삭제**
- SSR HTML을 `page.evaluate((html) => new DOMParser().parseFromString(html, "text/html"))`로 페이지 컨텍스트 안에서 파싱
- SSR/CSR 양쪽이 동일한 `extractPresenceSnapshot(root)` 로직 사용
- `data-value`는 root와 descendant 양쪽에서 탐색 (LiveOnboardingCounter 대응)
- 4 invariant 판정은 기존 로직 유지, 비교 키만 `(kind, index)`로 정확화

### 3. 의존성 추가

```bash
PUPPETEER_SKIP_DOWNLOAD=1 bun add -d puppeteer-core
```

브라우저 다운로드 없음. 패키지만 추가.

### 4. 검증 실행

```bash
bash scripts/guards.sh
node scripts/aliveness-check.mjs https://id-preview--ff1ae9d8-bcad-405a-ac39-d887b54f4b6b.lovable.app
```

산출물: `docs/presence/ALIVENESS_RUN.json`

### 5. 최종 보고

다음을 숨김 없이 보고:
- 최신 HEAD SHA
- 변경 파일 목록
- `ALIVENESS_RUN.json`의 4 invariant pass/fail (fail이면 원인 노드 포함)
- `guards.sh` 결과
- 실행 중 발생한 모든 에러 (sandbox launch 실패 등)

## 범위 외 (이번 작업에서 건드리지 않음)

- `presence-baseline.mjs` (별도 단계)
- PR-1 Step 1 이후 플랜
- README, deviceTier, 도메인 기능

## 완료 선언 조건

위 5단계가 모두 끝나고 `ALIVENESS_RUN.json`이 실제로 생성되어야만 "0단계 완료" 선언. 실패 시 실패로 보고하고 완료 선언하지 않음.