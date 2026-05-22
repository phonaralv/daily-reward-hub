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

먼저 “살아있음”이 사용자 심리에서 무엇인지 정의한다.
사람은 새 공간에 들어왔을 때 **3가지 무의식 질문**을 0.5~5초 안에 답으로 얻으려 한다.

1. “여기 진짜인가?” — 첫 화면이 어색하게 바뀌거나 깜빡이면 “가짜/베타”로 분류된다.
2. “지금도 누가 쓰고 있는가?” — 정적이면 “버려진 사이트”로 분류된다.
3. “이게 자동 스크립트인가, 진짜 흐름인가?” — 동시에 같이 움직이면 “fake”로 분류된다.

이 3가지 질문을 만족시켜야만 “살아있는 글로벌 플랫폼”이라는 첫 인상이 형성된다.
그 위에 “개인 정보가 노출되지 않는 신뢰감”까지 더해져야 PHONARA의 정체성이 된다.
아래 4 invariant는 그 4가지 인식 — 진짜감 / 현재성 / 자연스러움 / 신뢰감 — 의 1:1 매핑이다.

- **First Impression Invariant (→ 진짜감)**
  첫 페인트 후 1초 이내 보이는 모든 presence 문자열은 SSR과 동일.
  region 이름, ticker 문구, 카운터 정수부, pulse 라벨 전부.
  심리: 첫 0.5초의 “깜빡임/교체”는 무의식이 “미완성”으로 분류한다.
  Stake.com·Bybit 류 대형 플랫폼이 첫 진입에서 절대 보이지 않는 결함.

- **Movement Within 5 Seconds (→ 현재성)**
  마운트 후 5초 안에 화면에 보이는 presence 요소 중 최소 1개가 의미 있는 변화.
  (counter delta ≥ floor step, 또는 pulse 단계 변화)
  심리: 5초는 인간이 “이 화면이 지금 흐르고 있는가”를 판정하는 임계.
  넘으면 “정지된 페이지”로 분류되고, 다시 “움직임”을 봐도 회복이 어렵다.

- **No Lockstep (→ 자연스러움)**
  같은 뷰포트 presence 요소 중 동일 400ms 윈도우 안에서 동시에 갱신되는 요소는 1개 이하.
  심리: 동시 갱신은 무의식이 즉시 “스크립트/자동 새로고침”으로 잡아낸다.
  자연스러움은 “시간차”에서 온다. 400ms는 사람이 두 변화를 별도 사건으로 인식하는 하한.

- **Truth Boundary (→ 신뢰감)**
  presence 텍스트에 개인 식별/개인 수익/출금 문구가 절대 등장하지 않는다.
  aggregate(인원, 국가 수, region heat, global pulse)만 허용.
  심리: 가짜 개인 수익은 단기 자극은 주지만, 한 번 들키면 신뢰 회복이 불가능.
  PHONARA는 “전 지구적 흐름”으로 살아있음을 만들고, 개인은 PR-2 이후 실제 데이터로만 다룬다.

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

`scripts/aliveness-check.mjs` 신설. Playwright(Chromium headless)로 preview URL을 연다.

### Presence 영역의 정의 (추출 대상)

“presence 영역”은 자유 추정이 아니라 명시적으로 표시된 DOM만 본다.

- 모든 presence 컴포넌트의 루트에 `data-presence` 속성을 부여한다.
  값은 manifest kind: `online-count`, `countries`, `region-heat`,
  `global-pulse`, `ticker`, `onboarding-counter`.
  (0단계 코드 작업의 일부. build 모드에서 적용.)
- 숫자 변화만 정확히 잡기 위해 카운터 정수부는 `data-numeric` + `data-value`
  속성으로 노출 (`data-value`는 raw integer).
- ticker/region 텍스트는 `data-presence-text` 영역 안의
  텍스트 노드만 추출(아이콘/이모지 제외 위해 `:not([aria-hidden=true])`).

스크립트 동작:

1. `fetch(URL)`로 SSR HTML을 받아 `data-presence` 가진 노드의 텍스트와
   `data-value`를 **SSR snapshot**으로 저장.
2. Playwright로 같은 URL을 열고, `domcontentloaded` 직후 + 1000ms 시점에
   동일 셀렉터의 텍스트/`data-value`를 **CSR snapshot**으로 저장.
3. 그 후 5000ms 동안 `MutationObserver`를 page 컨텍스트에서 돌려
   `[data-presence] *` 의 텍스트/`data-value` 변화 이벤트를
   `{ts, kind, before, after}`로 수집해 반환받는다.

### Invariant 판정

- **First Impression Invariant**
  SSR snapshot vs CSR snapshot(1000ms 시점) 비교.
  `data-presence` 노드별로 `data-value`가 다르면 fail,
  `data-presence-text` 영역 텍스트가 다르면 fail.
  (이모지/공백/아이콘 차이는 무시: 비교 전에 `String.normalize("NFKC")` +
  `\s+ → " "` + zero-width 제거.)

- **Movement Within 5 Seconds**
  5초 mutation 로그에서 `data-value` 변화가 manifest의 floor step 이상인
  이벤트가 1건 이상, 또는 `global-pulse` 라벨이 다른 단계로 바뀐 이벤트가
  1건 이상이면 pass. 아니면 fail.

- **No Lockstep**
  mutation 로그 타임스탬프를 400ms 버킷으로 묶고, 한 버킷에 서로 다른
  `data-presence` kind가 2개 이상 변경되면 fail. 같은 kind 내부 다중 갱신은
  허용(단일 카운터의 ease step일 수 있음).

- **Truth Boundary**
  CSR snapshot + mutation 로그의 모든 텍스트를 합쳐 금지 정규식 검사.
  정규식은 0-A에 명시한 패턴을 그대로 사용:
  `\busername\b|\bwithdrew\b|\bwithdrawal\b|earned\s*[$₩]|profit\s*[$₩]|\bKRW\s*\d|\bUSD\s*\d`.
  매칭 시 fail + 매칭 노드의 `data-presence` 값 출력.

### 출력

`docs/presence/ALIVENESS_RUN.json`에 invariant별 pass/fail, 위반 노드,
mutation 타임라인을 저장. 0단계 종료 보고에 함께 첨부.

이로써 “Presence가 살아있다”가 코드로 검증 가능해지고,
1단계부터는 이 스크립트가 회귀 방지선이 된다.



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
