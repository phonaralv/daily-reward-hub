# P1-3 + P1-4 최종 실행 카드 (Grok 2 수정 반영)

## 반영된 수정

1. **라우트 적용 분할**: Group 1 (`trade`, `slots`, `play-free`, `wallet`) 먼저 적용. Group 2·3은 P1-4b로 분리하여 별도 실행 (Grok 추후 지시).
2. **자연스러움 우선**: glow는 `--shadow-presence-soft` 정도만 사용, `--shadow-presence-hot`은 P1-4b에서 hero hot-spot에만 한정. Motion은 `--motion-tick`/`--motion-pulse` 기본, 새 keyframe 추가 0.

---

## A. P1-3 — Primitives 5개 (`src/shared/ui/presence/primitives/`)

| 파일 | Source / hook | data-presence | 자연스러움 규칙 |
|---|---|---|---|
| `LiveValue.tsx` | `useLiveCounter` | `live-value` | tabular-nums, `transition: color var(--motion-tick)` 1줄, glow 없음 |
| `LiveDot.tsx` | `onlineDotSource` via `useSource` | `online-dot` | 기존 `.phonara-pulse` 재사용, soft glow만 |
| `LiveBadge.tsx` | `rewardWaveSource` via `useSource` | `reward-wave` | level chip만, intensity는 opacity 미세 변화 |
| `LiveTicker.tsx` | `tickerSource` via `useSource` | `ticker` | crossfade `--ease-presence-soft`, slide/marquee 사용 안 함 |
| `LiveHeatCell.tsx` | `worldActivityHeatSource` via `useSource` | `heat-cell` | heat → background opacity 매핑, glow 없음 |

- 모두 SSR-safe, hex/rgb 0
- React 진입은 `useSource`/`useLiveCounter`만 (Guard #9 통과)
- 기존 9개 Composition **0 수정**

테스트: `tests/presence/primitives.test.ts` (5 케이스 — SSR-safe render + `data-presence` 속성)

---

## B. P1-4a — Group 1 라우트 적용 (4개)

각 라우트의 placeholder 영역에 Primitive 추가만. 기존 마크업/Composition 미변경.

| 라우트 | 추가 Primitive | 위치 |
|---|---|---|
| `trade` | `LiveTicker` + `LiveDot` | placeholder 위 hero strip |
| `slots` | `LiveBadge` + `LiveValue`(seed 12_840) | placeholder 위 hero strip |
| `play-free` | `LiveBadge` 1개 | 기존 `LiveOnboardingCounter` 옆 |
| `wallet` | `LiveDot` + 작은 `LiveValue`(aggregate 활동량) | 잔고 카드 아래 strip |

Group 2 (`missions`, `account`) / Group 3 (`index`, `refer`)는 본 카드에서 제외. P1-4b 카드로 별도 진행.

---

## C. 변경 파일 (신규 6 / 수정 4)

**신규**
1. `src/shared/ui/presence/primitives/LiveValue.tsx`
2. `src/shared/ui/presence/primitives/LiveDot.tsx`
3. `src/shared/ui/presence/primitives/LiveBadge.tsx`
4. `src/shared/ui/presence/primitives/LiveTicker.tsx`
5. `src/shared/ui/presence/primitives/LiveHeatCell.tsx`
6. `tests/presence/primitives.test.ts`

**수정**: `src/routes/{trade,slots,play-free,wallet}.tsx`

기존 Composition 0 수정. 시각 회귀 위험 최소.

---

## D. 검증

- `bunx vitest run` → 37 + 5 = **42 케이스 green** 목표
- `scripts/guards.sh` → **9/9 PASS** (Guard #9 신규 Primitive React import 검사 면제 — primitives는 UI 레이어)
- Aliveness 영향: 1·4 invariant 자동 PASS(추가만), 2 강화, 3은 jitterKey 자동 분배로 유지

---

## E. 완료 후 보고 (Grok 요청 중점)

1. 5 Primitive + Source 매핑 표
2. Group 1 4개 라우트 적용 내용
3. vitest 결과 + Guard 9/9
4. 라우트별 aliveness 영향도 요약
5. **P1 전체 마무리 의견 + P2 진행 방향 제안** (Reward Loop Core 큰 그림)

승인 즉시 1회에 실행.
