# entities/

FSD layer — domain models. Each subfolder represents a single business entity
(wallet, mission, slot, reward, referral, account, …) and exports:

- `model/` — zustand stores, react-query selectors, derived state
- `api/`   — thin wrappers around server fns (`*.functions.ts`)
- `ui/`    — presentational components specific to the entity (cards, rows)

PR-1 ships this folder empty. PR-2 fills it as part of the core economy loop
(see `.lovable/plan.md` §3).

Rules:
- entities never import features/widgets.
- no business mutations here — entities surface read shape + cache keys only.
- all server calls go through `requireSupabaseAuth` server fns; no direct
  `supabase.from(...)` in entities (so RLS gates stay server-side).
