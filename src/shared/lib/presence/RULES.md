# Presence Layer Rules

The presence layer (live tickers, region heat, global pulse, onboarding
counters) exists to make Phonara feel like an already-active global
platform from day one.

## Forbidden — Hard rules

- ❌ **Fake individual earnings**. Never display a fabricated user name + earned amount.
- ❌ **Fake withdrawals**. Never claim someone just withdrew X.
- ❌ **Fake user identity**. No invented usernames, avatars, or quotes.
- ❌ **Static counters** that never move once mounted.
- ❌ **All counters updating in lockstep** (gives away simulation).

## Allowed — Aggregate-only

- ✅ Aggregate active counters ("12,431명 참여 중").
- ✅ Region pulse ("Tokyo 지금 활발해요").
- ✅ Country count ("42개국에서 참여 중").
- ✅ Trend bias chips ("HOT NOW / TRENDING / GLOBAL SURGE").
- ✅ Onboarding/install momentum (aggregate, no identities).

## Kill switches (server-side)

- `presence_engine_enabled` — global OFF switch.
- `presence_dynamic_updates_enabled` — freeze all counters at seed.
- `presence_update_intensity` — `low | normal | launch | viral`.
- `presence_seed_ratio` (0–100) — % of seed waves vs. real aggregate events.
- `launch_presence_mode` — boost amplitude during launch.

When real aggregate events exceed the seed envelope, the real data takes
priority and `presence_seed_ratio` should be lowered manually.

## Variation rules

- Every counter must change in 2–8 second intervals (small delta).
- 30–90 second waves for larger movements.
- Counters may decrease occasionally — never monotonic.
- Components stagger their tick offsets (no simultaneous updates).
- Hidden tab → all updates pause.
- Reduced motion → instant value snap, no easing.
