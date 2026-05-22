# PR-1 Step 1 — Presence 단일 스케줄러 (Build 실행 계획)

## 목표

Presence 레이어를 "단일 rAF 스케줄러" 하나로 흐르게 한다. 그 외(telemetry, baseline, source 분리)는 Step 2로 미룬다.

---

## 작업 순서

### 1. `src/shared/lib/presence/runtime/scheduler.ts` (신규)

- export `subscribeTick(fn: (now: number) => void): () => void`
- 모듈 상태: `ticks: Set<Tick>`, `rafId: number|null`, `visListener: (()=>void)|null`
- `loop(now)`에서 `document.visibilityState === "visible"`일 때만 ticks 호출
- ticks.size === 0 → rAF/visibilitychange listener 자동 해제
- SSR 가드: `typeof window === "undefined"` → no-op cleanup 반환
- HMR dispose 5줄(`import.meta.hot`)로 좀비 rAF 차단

### 2. `src/shared/lib/presence/flags.ts` (신규)

- 5개 킬스위치 상수: `PRESENCE_ENGINE_ENABLED`, `PRESENCE_DYNAMIC_UPDATES_ENABLED`, `PRESENCE_UPDATE_INTENSITY`, `PRESENCE_SEED_RATIO`, `LAUNCH_PRESENCE_MODE`
- 헬퍼 `getPresenceFlags()` — PR-2에서 server-driven 교체 시 유일한 변경점
- 현재 값은 빌드타임 상수 (RULES.md와 동기)

### 3. `tests/presence/scheduler.test.ts` (신규, 3 케이스)

- ① subscribe/unsubscribe 대칭 — off() 후 ticks.size === 0
- ② visibility hidden → tick 미호출
- ③ ticks 비면 rAF/listener 정리
- vitest + jsdom. 타이밍 정밀도 아닌 contract만 검증

### 4. 기존 hook 어댑터화 (동작 변경 금지, 위임만)

- `liveEngine.ts` `useLiveCounter`: setInterval/setTimeout 제거 → subscribeTick 1개로 수렴. tick 내부에서 자체 `nextScheduledAt` 비교로 기존 interval/wave 의미 보존. ease 상수/wave 주기 그대로.
- `useGlobalPulse.ts`: 60s 재계산을 subscribeTick + 내부 nextAt으로 변환. 첫 라이브 전환은 PRESENCE_FIRST_LIVE_DELAY_MS + jitter 유지.
- `waveEngine.ts` `useActiveRegions`: 45s 재계산 동일 변환. first-paint 순수 함수(`getDeterministicRegions`, `stablePresenceHash`)는 그대로.
- **외부 export 시그니처 byte-identical**. UI 컴포넌트 import 경로 0 변경.

### 5. `scripts/guards.sh`에 가드 2개 추가

- #6 presence/ 안에서 직접 setInterval/setTimeout 사용 금지 (scheduler.ts 제외, easeMs 등 ID 라벨은 grep 제외)
- #7 src/shared/ui/presence/ 가 scheduler를 직접 import 금지 (hook 경유 강제)

### 6. 검증

```bash
# before SHA에서
node scripts/aliveness-check.mjs http://localhost:8080/
mv docs/presence/ALIVENESS_RUN.json docs/presence/ALIVENESS_RUN_BEFORE.json

# 어댑터화 후
bash scripts/guards.sh
bunx vitest run tests/presence
node scripts/aliveness-check.mjs http://localhost:8080/
# → docs/presence/ALIVENESS_RUN_AFTER.json
```

### 7. HMR 수동 검증

dev 서버에서 `scheduler.ts` 저장 10회 → DevTools Performance에서 활성 rAF 1개 이하 확인. 결과 보고에 포함.

---

## 완료 기준 (6개 전부)

1. ☐ 활성 setInterval/setTimeout 0개, listener 1개 이하 (가드 #6 + 수동 확인)
2. ☐ 기존 hook export 시그니처 byte-identical (git diff)
3. ☐ src/shared/ui/presence/ diff = 0 lines (git diff --stat)
4. ☐ Step 0의 4 invariant 전부 재PASS (ALIVENESS_RUN_AFTER.json)
5. ☐ vitest 3 케이스 green
6. ☐ flags.ts 단일 진입점 (가드 #7)

## Step 2로 미루는 것 (명시)

- Performance Invariant (long-task, mutation rate)
- telemetry ring buffer
- presence-baseline.mjs 완성
- source 파일 세분화 / PresenceSource interface 정식화
- UI 컨트랙트 테스트

## 신규/수정 파일

- 신규 3: `scheduler.ts`, `flags.ts`, `scheduler.test.ts`
- 수정 5: `liveEngine.ts`, `useGlobalPulse.ts`, `waveEngine.ts`, `guards.sh`, `docs/presence/ALIVENESS.md`
- UI 컴포넌트 수정: 0

## 최종 보고 항목

- 최신 HEAD SHA + 변경 파일 목록
- 6가지 완료 기준 체크박스 결과
- vitest 실행 결과 raw
- aliveness-check 4 invariant 결과 (BEFORE/AFTER 비교)
- HMR rAF 누수 수동 검증 결과
- 실패 항목이 있으면 숨김 없이 보고
