# PR-1 Polish — Step 0 only: Presence Aliveness Baseline

이전 플랜들은 모두 폐기. 이번 응답은 **0단계만** 다룬다.
0단계가 사용자와 합의되어 끝나야 1단계 플랜이 나온다.
4단계를 한 번에 보여주는 행위 자체가 PR-1 원칙 위반이므로 반복하지 않는다.

## 0단계의 본질

PR-1의 정체성은 “Presence가 살아있다”이다.
그런데 지금 preview에서 SSR/CSR이 서로 다른 region(예: 서버 Berlin, 클라이언트 London)을
렌더한다. 첫 인상에서 “살아있음”이 아닌 “불안정함”이 먼저 전달된다.
이 상태로 1~4단계를 쌓는 것은 무너진 기초 위에 짓는 행위다.

따라서 0단계는 단순한 버그 픽스가 아니라:

1. PHONARA의 “살아있음”이 무엇인지 **운영 가능한 정의**로 박는다.
2. 그 정의를 **측정 가능한 baseline**으로 만든다.
3. 첫 진입 순간에 그 정의가 깨지지 않도록 **하드웨어/네트워크 조건별로 검증**한다.

## 0-A. Aliveness Spec (감성을 운영 정의로)

`docs/presence/ALIVENESS.md` 신설. PR 전체의 북극성.

다음 4가지를 1페이지로 명시한다.

- **First Impression Invariant**
  첫 화면 페인트 후 1초 이내에 사용자가 보는 모든 presence 문자열은 SSR과 동일해야 한다.
  region 이름, ticker 문구, 카운터 정수부, pulse 라벨 전부.
  → 위반 시 “살아있음”이 아니라 “깜빡임”으로 인식된다.

- **Movement Within 5 Seconds**
  마운트 후 5초 안에 화면에 보이는 presence 요소 중 **최소 1개**가 의미 있는 변화를 보인다.
  (counter delta ≥ floor 변화 또는 pulse 단계 변화)
  → 5초 동안 정지하면 “정적 페이지”로 인식된다.

- **No Lockstep**
  같은 뷰포트에 있는 presence 요소 중 동일 400ms 윈도우 안에서 동시에 갱신되는 요소는 1개를 넘지 않는다.
  → 동시 갱신은 “자동 새로고침”의 인공적 느낌을 만든다.

- **Truth Boundary**
  presence 텍스트에는 개인 식별/개인 수익/출금 문구가 절대 등장하지 않는다.
  aggregate(인원, 국가 수, region heat, global pulse)만 허용.

이 4가지가 PR-1 내내 인용되는 단일 출처가 된다.
이후 모든 단계의 “완료”는 이 4가지 invariant로만 판정한다.

## 0-B. Hydration & First Paint 수정

원인 후보:
- `WorldwideTicker`, `RegionHeatBadge`가 `Math.random()` / `Date.now()` / `getTimeMultiplier()` 결과를
  SSR과 CSR에서 다르게 평가한다.
- `useActiveRegions` 류가 모듈 로드 시점에 한 번만 셔플하는데, 서버/클라이언트가 같은 모듈 인스턴스를
  공유하지 않으므로 결과가 달라진다.

수정 원칙(코드 작업은 build 모드에서):
- 첫 렌더 값은 **요청 단위 seed**(예: route loader가 만든 안정 값)로부터 deterministic 도출.
- 시간/locale/random 입력은 **mount 이후**에만 사용. `useEffect` 안에서만 live 모드 진입.
- region/ticker 선택은 `seed → hash → index` 순수 함수로 분리.

수정 후 확인:
- preview에서 hydration 경고 0건.
- view-source의 첫 paint 문자열이 마운트 직후 첫 frame과 동일.

## 0-C. Baseline 측정 (정적 분석이 아니라 실측)

`scripts/presence-baseline.mjs` 신설. Puppeteer/Playwright 없이도 가능한 최소 측정:

- preview URL을 headless로 열고, `performance.getEntriesByType("longtask")`,
  `PerformanceObserver("event")`(INP 근사), `requestAnimationFrame` 호출 수,
  `setTimeout` 호출 수를 30초간 수집.
- 동일 측정을 3가지 프로파일로 반복:
  1. desktop default
  2. CPU 4x throttle + Slow 3G (저가 안드로이드 근사)
  3. CPU 6x throttle + offline-after-load (체감 한계)
- 결과를 `docs/presence/BASELINE.json`에 저장. 0단계 종료 보고에 그대로 첨부.

이 baseline은 1단계 이후 Runtime Budget의 “before/after” 비교 기준이 된다.
숫자가 임의적이라는 비판을 피하기 위해, 예산은 baseline 측정 후에만 확정한다.

## 0-D. Aliveness 자동 체크 (실측 기반)

`scripts/aliveness-check.mjs` 신설. CI에서 PR마다 돌릴 수 있게 한다.

검증 항목 — 0-A의 4 invariant를 직접 측정:
- **First Impression Invariant**: SSR HTML 스냅샷의 presence 문자열 vs 마운트 후 1초 시점 DOM 비교. 다르면 fail.
- **Movement Within 5 Seconds**: 5초간 DOM mutation 관찰. presence 영역에 의미 있는 텍스트 변화 0건이면 fail.
- **No Lockstep**: mutation 타임라인을 400ms 버킷으로 묶어 동시 갱신 수가 2 이상인 버킷이 있으면 fail.
- **Truth Boundary**: presence 영역 텍스트에 금지 패턴 매칭되면 fail (정규식은 0-A에 명시).

이로써 “Presence가 살아있다”가 코드로 검증 가능해진다.
1단계부터는 이 스크립트가 회귀 방지선 역할을 한다.

## 0단계 종료 조건 (이게 통과해야 1단계 플랜을 낸다)

- hydration 경고 0
- `aliveness-check` 4 invariant 모두 pass
- `presence-baseline.json` 3개 프로파일 측정값 첨부
- 변경 파일 목록 + 마지막 커밋 SHA
- 사용자가 “0단계 OK, 1단계 플랜 만들어라”라고 명시 승인

## 이번 응답에서 의도적으로 하지 않는 것

- 1, 2, 3, 4단계 사전 노출 (한 단계만 깊게 합의한다)
- manifest / clock / contract 같은 시스템 설계 미리 확정
- deviceTier 정의
- README 수정
- 가드 추가 (1단계에서 다룬다)
- 임의 예산 숫자 (baseline 측정 후에만 정한다)
