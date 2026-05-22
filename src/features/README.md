# features/

FSD layer — user-facing actions. One folder per discrete interaction
(claim-mission, spin-slot, open-chest, redeem-code, daily-checkin,
free-play-claim, install-reward, …).

Each feature owns:
- the mutation (react-query `useMutation` wrapping a `*.functions.ts` server fn)
- optimistic UI + invalidation
- the trigger UI (button, sheet, modal)
- success/error toasts via `@/shared/lib/notify`

PR-1 ships this folder empty. PR-2 fills it once the matching entities and
DB tables exist (see `.lovable/plan.md` §2–§5).

Rules:
- features may import entities and shared; never widgets.
- every mutation is idempotent and rate-limited server-side.
- all reward grants go through the wallet ledger — never mutate `wallets` directly.
