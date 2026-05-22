# Phonara V2 — apps/web

Mobile-first, Korean-first, globally-alive next-gen platform.
PR-1 scope: production-grade foundation only (shell, PWA, presence engine,
notifications, i18n). Business logic (wallet/missions/slots/referrals)
lands in PR-2.

---

## Stack

- TanStack Start v1 (React 19, Vite 7, Cloudflare Workers SSR)
- Tailwind v4 with HSL semantic tokens (`src/styles.css`)
- External Supabase project `edlhlbwojgdnpdjhorpb` (Lovable Cloud disabled)
- Zustand + TanStack Query, Framer Motion, Sonner via `@/shared/lib/notify`

---

## Local setup

```bash
bun install
cp .env.example .env
# fill VITE_SUPABASE_ANON_KEY from Supabase Dashboard → Settings → API
bun run dev
```

If `.env` is missing, the app still boots with a placeholder key — Supabase
calls 401 but the shell renders for layout work.

### Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client + SSR | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client + SSR | Publishable anon key |
| `SUPABASE_URL` | server fns | Same URL, server side |
| `SUPABASE_PUBLISHABLE_KEY` | server fns | Server-side publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | server fns only | Admin client (PR-2+) — **never** expose |

---

## DB migrations (PR-1)

Apply in order via the Supabase SQL editor or `supabase db push`.
All tables have RLS ON. Policies use `auth.uid()` and the
`has_role()` SECURITY DEFINER helper.

```text
01_extensions.sql       pgcrypto, citext
02_profiles.sql         profiles + handle uniqueness
03_user_roles.sql       app_role enum + user_roles + has_role()
04_kill_switches.sql    feature_flags + presence_* + launch_presence_mode
05_seed_regions.sql     region presence baseline (Asia/EU/NA/SA)
06_notification_prefs.sql per-user notification channels
07_notifications.sql    notifications + Realtime channel
```

PR-2 continues at `10_wallet.sql` (see `.lovable/plan.md`).

---

## CI guards

Run before pushing:

```bash
bash scripts/guards.sh
```

Checks:
1. `client.server.ts` is never imported from client code.
2. No hardcoded hex colors outside `src/styles.css`.
3. No `rgb()/rgba()` literals in components.
4. `src/pages/` does not exist (TanStack uses `src/routes/`).
5. `sonner` is only imported via `@/shared/lib/notify`.

Same rules are also enforced by `eslint.config.js`.

---

## PWA

- `public/manifest.webmanifest` — `display: standalone`, `theme_color: #0B0B0F`.
- `src/shared/lib/pwa/register.ts` registers the service worker **only** in
  production on non-preview hosts. Inside Lovable preview / any iframe, any
  previously-registered SW + caches are purged automatically.
- Runtime caching (Workbox `NetworkFirst` for HTML, `StaleWhileRevalidate`
  for assets) is **deferred to PR-2**. The SW file ships then.

---

## Presence engine

`src/shared/lib/presence/` — aggregate-only "globally active" UX.

- `useLiveCounter` — 2–8s ticks + 30–90s waves, GPU-eased, pauses on hidden tab.
- Time-multiplier biases per region/time-of-day (`waveEngine.ts`).
- Kill switches: `presence_engine_enabled`, `presence_dynamic_updates_enabled`,
  `presence_update_intensity`, `presence_seed_ratio`, `launch_presence_mode`.
- Hard rules: aggregate only — no fake usernames, withdrawals, or earnings.
  See `src/shared/lib/presence/RULES.md`.

---

## Next

See `.lovable/plan.md` for the PR-2 roadmap (wallet, missions, slots,
free-play, referrals, daily check-in, reward chests, FOMO drops).
