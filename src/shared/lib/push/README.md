# Web Push (PR-9 implementation target)

This folder reserves the surface area for Web Push notifications.

- `permission.ts` — request notification permission flow.
- `registerToken.ts` — upsert into `push_tokens` table.

Requirements that ship in PR-9:
- VAPID public/private keypair (private stored as `VAPID_PRIVATE_KEY` secret).
- Background SW that handles `push` event.
- iOS Safari 16.4+: Web Push works only when the app is installed as a standalone PWA.

PR-1 just provides typed stubs so call-sites compile.
