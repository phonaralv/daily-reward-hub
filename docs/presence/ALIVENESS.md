# PHONARA Presence Aliveness Spec

PR-1의 북극성. 모든 PR-1 단계의 "완료"는 이 문서의 4 invariant로만 판정한다.

## 1. 왜 "살아있음"인가

사람은 새 공간(앱/사이트)에 진입한 0.5~5초 안에 무의식적으로 3가지 질문을 던진다.

1. **여기 진짜인가?** — 첫 화면이 어색하게 바뀌거나 깜빡이면 "가짜/베타"로 분류된다.
2. **지금도 누가 쓰고 있는가?** — 정적이면 "버려진 사이트"로 분류된다.
3. **이게 자동 스크립트인가, 진짜 흐름인가?** — 동시에 같이 움직이면 "fake"로 분류된다.

이 3가지를 만족시켜야 "살아있는 글로벌 플랫폼"이라는 첫 인상이 형성된다.
그 위에 **개인 정보가 노출되지 않는 신뢰감**이 더해져야 PHONARA의 정체성이 된다.

아래 4 invariant는 그 인식 — **진짜감 / 현재성 / 자연스러움 / 신뢰감** — 의 1:1 매핑이다.

---

## 2. Invariants

### Invariant 1 — First Impression Invariant (→ 진짜감)

첫 페인트 후 1초 이내에 사용자가 보는 모든 presence 문자열은 SSR과 동일해야 한다.
대상: region 이름, ticker 문구, 카운터 정수부, pulse 라벨.

심리: 첫 0.5초의 "깜빡임/교체"는 무의식이 "미완성"으로 분류한다.
Stake.com·Bybit 류 대형 플랫폼이 첫 진입에서 절대 보이지 않는 결함.

기술 구현 원칙:
- 첫 렌더 값은 deterministic. `Math.random()`/`Date.now()`/locale은 mount 이후에만 사용.
- region/ticker 선택은 `seed → hash → index` 순수 함수, 또는 declaration order snapshot.

### Invariant 2 — Movement Within 5 Seconds (→ 현재성)

마운트 후 5초 안에 화면에 보이는 presence 요소 중 **최소 1개**가 의미 있는 변화를 보인다.
의미 있는 변화 = counter `data-value` 변화가 manifest floor step 이상,
또는 `global-pulse` 라벨이 다른 단계로 변화.

심리: 5초는 인간이 "이 화면이 지금 흐르고 있는가"를 판정하는 임계.
넘으면 "정지된 페이지"로 분류되고, 이후 움직임을 봐도 회복이 어렵다.

### Invariant 3 — No Lockstep (→ 자연스러움)

같은 뷰포트의 presence 요소 중 동일 400ms 윈도우 안에서
서로 다른 `data-presence` kind가 2개 이상 동시 갱신되면 위반.
(같은 kind 내부의 ease step은 허용.)

심리: 동시 갱신은 무의식이 즉시 "스크립트/자동 새로고침"으로 잡아낸다.
자연스러움은 "시간차"에서 온다. 400ms는 사람이 두 변화를 별도 사건으로 인식하는 하한.

### Invariant 4 — Truth Boundary (→ 신뢰감)

presence 텍스트에 개인 식별/개인 수익/출금 문구가 절대 등장하지 않는다.
aggregate(인원, 국가 수, region heat, global pulse, ticker)만 허용.

금지 정규식 (대소문자 무시):
```
\busername\b|\bwithdrew\b|\bwithdrawal\b|earned\s*[$₩]|profit\s*[$₩]|\bKRW\s*\d|\bUSD\s*\d
```

심리: 가짜 개인 수익은 단기 자극은 주지만, 한 번 들키면 신뢰 회복이 불가능.
PHONARA는 "전 지구적 흐름"으로 살아있음을 만들고, 개인은 PR-2 이후 실제 데이터로만 다룬다.

---

## 3. DOM 계약 (검증 가능성 확보)

`aliveness-check`는 명시적으로 표시된 DOM만 본다.

- 모든 presence 컴포넌트 루트에 `data-presence="<kind>"`.
  kind ∈ `online-count | countries | region-heat | global-pulse | ticker | onboarding-counter`.
- 카운터는 raw integer를 `data-value` 속성으로 노출. 표시 텍스트 포맷팅과 분리.
- 텍스트 비교 영역은 `data-presence-text`로 명시 (아이콘/이모지 분리).

---

## 4. 적용 범위

- PR-1: invariant 1, 4는 정적/실측으로 hard pass 필수. 2, 3은 baseline 측정 + 1단계 이후 개선.
- PR-2 이후: 실제 aggregate 이벤트가 들어와도 동일 invariant 유지.
- Kill switch (`presence_engine_enabled=false`) 시: invariant 2는 자동 면제, 1·3·4는 유지.
