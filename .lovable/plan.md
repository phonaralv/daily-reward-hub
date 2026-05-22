# PR-1 Step 2 — 최종 확정안 (Build Mode 직전)

**단일 초점**: presence hook이 직접 값을 계산하지 않고, 좁은 `PresenceSource` 인터페이스에서만 값을 받는다. 그 활동량은 in-memory telemetry로 관찰 가능하다.

원칙: UI 시그니처 불변 · UI 컴포넌트 수정 0 · 모든 주장은 측정으로 증명 · 1 PR로 리뷰/롤백 가능.

---

## 1. 신규/수정 파일 확정 (신규 6, 수정 5)

### 신규
1. `src/shared/lib/presence/sources/types.ts`
2. `src/shared/lib/presence/sources/heatRegionSource.ts`
3. `src/shared/lib/presence/sources/liveCounterSource.ts`
4. `src/shared/lib/presence/runtime/useSource.ts`
5. `src/shared/lib/presence/runtime/telemetry.ts`
6. `tests/presence/sources.test.ts`

### 수정
- `src/shared/lib/presence/waveEngine.ts` — `useActiveRegions`를 `useSource(heatRegionSource(...), ...)` 위임으로 교체. `getDeterministicRegions` / `regionHeat` / 상수들은 **export 유지** (source 파일이 import).
- `src/shared/lib/presence/liveEngine.ts` — `useLiveCounter`를 `useSource(liveCounterSource(seed, opts), ...)` 위임으로 교체.
- `src/shared/lib/presence/useGlobalPulse.ts` — 파일 내 inline source 객체(`{ key:"global-pulse", firstPaint, sample, minIntervalMs }`) + `useSource` 위임.
- `src/shared/lib/presence/runtime/scheduler.ts` — `loop()`에서 tick 1회당 `recordTick(performance.now() - start)` 1줄.
- `scripts/guards.sh` — 가드 #8 추가.
- (문서) `docs/presence/ALIVENESS.md` §Source 1문단 추가.

UI 컴포넌트 수정: **0**. 시각적 출력 변화: **0**.

---

## 2. 핵심 계약

### `PresenceSource<T>`
```ts
export interface PresenceSource<T> {
  readonly key: string;             // telemetry/디버깅 id (kebab-case)
  firstPaint(): T;                  // SSR + CSR 첫 1초 동일값. pure.
  sample(now: number, prev: T): T;  // 변화 없으면 prev 그대로 반환 (참조 동일성 유지)
  readonly minIntervalMs: number;   // 다음 sample 호출 최소 간격
}
```

### `useSource<T>(source, opts)`
- `subscribeTick` 1회 구독.
- 첫 paint 값 = `source.firstPaint()` (useMemo, deps: source.key).
- `nextAt = mountedAt + max(PRESENCE_QUIET_WINDOW_MS, opts.firstLiveDelayMs ?? PRESENCE_FIRST_LIVE_DELAY_MS) + (opts.jitterKey ? presenceLockstepJitter(opts.jitterKey) : 0)`.
- tick 콜백:
  - `now < nextAt` → return.
  - `next = source.sample(now, prev)`.
  - `next !== prev` → `setState(next)` + `recordMutation(source.key)`.
  - `nextAt = now + source.minIntervalMs`.
- SSR/no-window 가드 동일.
- ease/내부 상태는 **source가 클로저로 보유**(useSource는 불가지).

### `telemetry.ts` (PROD에서도 무해)
- `tickRing: Float32Array(256)` + `tickRingIdx: number`.
- `mutationsByKey: Map<string, number>`.
- API: `recordTick(d: number)`, `recordMutation(key: string)`, `getTelemetrySnapshot(): { tickAvgMs, tickMaxMs, tickCount, mutations: Record<string, number> }`, `__resetTelemetry()` (테스트 전용).
- allocation: tick 경로 0, mutation 경로 0(Map.set만). console 출력 0.

---

## 3. Source 구현 명세 (회귀 방지용)

### `heatRegionSource(count, seed)`
- `key`: `"region-heat"`.
- `firstPaint`: `getDeterministicRegions(count, seed)` 그대로.
- `sample(now, prev)`: heat 정렬한 결과를 반환. **prev와 region.id 시퀀스가 동일하면 prev 반환**(참조 동일성으로 setState 0회 보장).
- `minIntervalMs`: 45_000 (기존 REFRESH_MS 유지).

### `liveCounterSource(seed, opts)`
- `key`: `"live-counter"` (옵션의 `category`로 suffix 가능: `"live-counter:onboarding"`).
- 내부 상태(클로저): `target`, `from`, `easeStart`, `nextTickAt`, `nextWaveAt`, `current`(display).
- `firstPaint`: `seed`.
- `sample(now, prev)`:
  - ease 진행 → `current` 업데이트.
  - `now >= nextTickAt` → 작은 delta 적용 + `nextTickAt` 재계산.
  - `now >= nextWaveAt` → 큰 delta 적용 + `nextWaveAt` 재계산.
  - 반환: `current === prev ? prev : current`.
- `minIntervalMs`: `0` (ease 부드러움을 위해 매 rAF tick 허용). 실제 delta 발생은 내부 nextTickAt 게이트로 제한.
- intensity/category/lowEnd/quiet window 처리는 source 내부.

### `useGlobalPulse` inline source
- `key`: `"global-pulse"`.
- `firstPaint`: `GLOBAL_PULSE_FIRST_PAINT`.
- `sample`: `computePulse()` 호출, 동일 결과면 prev 반환.
- `minIntervalMs`: `PULSE_REFRESH_MS` (60_000).

---

## 4. 가드 #8 (신규)

`scripts/guards.sh`:
```bash
check "no Math.random/Date.now/hourInTz in presence hook files" \
  "grep -RIn --include='*.ts' \
     -E '\\b(Math\\.random|Date\\.now|hourInTz)\\b' \
     src/shared/lib/presence/useGlobalPulse.ts \
     src/shared/lib/presence/liveEngine.ts \
     src/shared/lib/presence/waveEngine.ts \
   | grep -v 'sources/' \
   | grep -v '// allow-source-call'"
```
- 적용 대상: 3 hook 파일에 한정. source 파일/유틸은 자유.
- 의미: 데이터 계산이 source 밖으로 새지 않음을 보장.

---

## 5. 테스트 — `tests/presence/sources.test.ts` 5 케이스

1. **heatRegionSource.firstPaint** 100회 호출 → 모두 같은 region.id 시퀀스.
2. **liveCounterSource.firstPaint** = seed 정수, 100회 호출 결정적.
3. **sample minInterval gate**: `useSource`에 fake source(`minIntervalMs=1000`) + fake tick 시퀀스 — 1000ms 미만 호출에서 sample 미호출(spy).
4. **참조 동일성**: source.sample이 prev 반환 → useSource state setter 미호출(react-hooks-testing-library 또는 수동 mock으로 검증).
5. **telemetry**: `recordTick` 300회 → ring wrap, `getTelemetrySnapshot().tickCount === 300`, `tickAvgMs`/`tickMaxMs` 정확. `recordMutation("x")` 2회, `recordMutation("y")` 1회 → mutations 정확.

기존 `scheduler.test.ts` 3 케이스는 그대로 통과해야 함.

---

## 6. 완료 기준 (5개, 한 줄 검증)

1. **Hook 슬림화**: 3 hook 파일 본문 각 ≤ 15줄, 시간/heat/난수 계산 0줄.
2. **Source 단일 진입점**: `grep -E "Math\.random|Date\.now|hourInTz" src/shared/lib/presence/{useGlobalPulse,liveEngine,waveEngine}.ts` → 0건 (가드 #8 PASS).
3. **시그니처/Invariant 무회귀**: aliveness 4 invariant 재PASS + UI 컴포넌트 git diff 0.
4. **Telemetry 동작**: sources.test의 telemetry 케이스 green.
5. **전체 가드 + vitest green**: guards #1–#8 PASS, 모든 vitest 케이스 PASS.

---

## 7. 위험 / 대응 (Step 2 한정)

| 위험 | 대응 |
|---|---|
| Source 추출 중 mutation 패턴 변형 | aliveness-check `mutations` 배열을 before/after 저장 → kind별 (count, 평균 간격) 비교, ±20% 이내면 PASS, 초과 시 source 로직 재확인 |
| `useSource`가 3 hook의 서로 다른 quiet/jitter/ease 요구를 흡수 못 함 | quiet/jitter는 useSource가 흡수, ease는 source 내부. 인터페이스 단순 유지 |
| `liveCounterSource`의 `minIntervalMs=0`가 telemetry mutation count를 부풀림 | source는 내부 nextTickAt 게이트로 실제 delta 발생만 prev≠next로 반환. ease 중간값은 prev 반환 처리(또는 mutation 1회만 count). 테스트로 회귀 차단 |
| Telemetry 오버헤드가 longtask 유발 | tick 경로 allocation 0, Map.set 1회. Step 3 baseline에서 실측 확인(이번 단계는 코드 수준 검증) |
| 가드 #8 false positive | 대상 3 파일에 한정 + `// allow-source-call` escape hatch + `sources/` grep 제외 |

---

## 8. 실행 순서 (Build Mode 승인 직후)

1. `sources/types.ts` 작성.
2. `sources/heatRegionSource.ts`, `sources/liveCounterSource.ts` 작성.
3. `tests/presence/sources.test.ts` 작성 (source 케이스 1–4) → vitest green.
4. `runtime/useSource.ts` 작성.
5. **aliveness-check 실행 → `ALIVENESS_RUN_BEFORE_STEP2.json` 저장**.
6. `waveEngine.ts`, `liveEngine.ts`, `useGlobalPulse.ts`를 useSource 위임으로 교체.
7. `runtime/telemetry.ts` 작성, `scheduler.ts`/`useSource.ts`에 1줄씩 연동.
8. sources.test에 telemetry 케이스 5 추가 → vitest green.
9. `guards.sh` 가드 #8 추가, `ALIVENESS.md` §Source 1문단 추가.
10. **aliveness-check 재실행 → `ALIVENESS_RUN_AFTER_STEP2.json` 저장**, mutation 패턴 diff 확인.
11. 전체 가드 + vitest 최종 실행.
12. 완료 보고:
    - HEAD SHA + 변경 파일 목록
    - 5 완료 기준 체크박스
    - aliveness before/after 4 invariant 결과 + mutation 패턴 diff
    - vitest 결과 raw

---

이대로 Build Mode 전환을 진행하면 됩니다. 승인 부탁드립니다.
