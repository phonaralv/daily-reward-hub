#!/usr/bin/env bash
# PHONARA CI guards — fail fast on architectural violations.
# Usage: bash scripts/guards.sh
set -uo pipefail

fail=0
RED=$'\033[0;31m'; GREEN=$'\033[0;32m'; YEL=$'\033[0;33m'; NC=$'\033[0m'

check() {
  local label="$1"; local cmd="$2"
  echo "${YEL}▶ ${label}${NC}"
  local out
  out=$(eval "$cmd" 2>/dev/null || true)
  if [ -n "$out" ]; then
    echo "${RED}✗ FAIL${NC}"
    echo "$out"
    fail=1
  else
    echo "${GREEN}✓ ok${NC}"
  fi
}

# 1. client.server.ts must never be imported from client code.
check "no client import of client.server.ts" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     --exclude-dir=node_modules --exclude-dir=.output --exclude-dir=dist \
     -E \"from ['\\\"][^'\\\"]*supabase/client\\.server\" src \
   | grep -v 'integrations/supabase/client.server.ts' \
   | grep -v '\\.server\\.ts' \
   | grep -v '\\.functions\\.ts'"

# 2. No hard-coded hex colors in component/style code (use design tokens).
#    Allowed paths: design system source, SSR error page (no Tailwind there),
#    chart shadcn primitive (recharts CSS selectors), PWA theme-color meta tag.
check "no hardcoded hex colors in src" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     --exclude-dir=node_modules \
     -E '#[0-9a-fA-F]{3,8}\\b' src \
   | grep -v 'src/styles.css' \
   | grep -v 'src/lib/error-page.ts' \
   | grep -v 'src/components/ui/chart.tsx' \
   | grep -v 'theme-color' \
   | grep -v '\\.server\\.ts' \
   | grep -v '// allow-hex'"

# 3. No rgb()/rgba() literals in components.
check "no rgb()/rgba() literals in src" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     --exclude-dir=node_modules \
     -E 'rgba?\\([0-9]' src \
   | grep -v 'src/styles.css' \
   | grep -v '// allow-rgb'"

# 4. src/pages/ is forbidden (TanStack Start uses src/routes/).
check "no src/pages/ directory" \
  "[ -d src/pages ] && echo 'src/pages/ exists — move files to src/routes/'"

# 5. Direct `from \"sonner\"` import — must go through shared/lib/notify.
check "no direct sonner imports outside notify.ts" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     --exclude-dir=node_modules \
     -E \"from ['\\\"]sonner['\\\"]\" src \
   | grep -v 'shared/lib/notify.ts' \
   | grep -v 'components/ui/sonner'"

# 6. No direct setInterval/setTimeout inside the presence layer
#    (except the scheduler itself). All timing must flow through subscribeTick.
check "no setInterval/setTimeout in presence/ outside scheduler" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     --exclude-dir=node_modules \
     -E '\\b(setInterval|setTimeout)\\b' src/shared/lib/presence src/shared/ui/presence \
   | grep -v 'runtime/scheduler.ts'"

# 7. presence UI components must not import the scheduler directly —
#    they only use the public hooks (useLiveCounter, useActiveRegions, useGlobalPulse).
check "presence UI does not import scheduler directly" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     --exclude-dir=node_modules \
     -E \"from ['\\\"][^'\\\"]*presence/runtime/scheduler\" src/shared/ui"

# 8. No direct value computation (Math.random / Date.now / hourInTz) inside
#    presence hook files — all derivation must live in a PresenceSource.
check "no value-computation primitives in presence hook files" \
  "grep -RIn --include='*.ts' \
     -E '\\b(Math\\.random|Date\\.now|hourInTz)\\b' \
     src/shared/lib/presence/useGlobalPulse.ts \
     src/shared/lib/presence/liveEngine.ts \
     src/shared/lib/presence/waveEngine.ts \
   | grep -v '// allow-source-call' \
   | grep -vE ':[[:space:]]*\\*'"

# 9. PresenceSource purity — files under presence/sources/ MUST be pure
#    data producers. They cannot import React, call React hooks, or talk
#    to the scheduler directly. The single sanctioned React entry point
#    is runtime/useSource.ts.
#
#    위반 시: "Source 파일은 React를 직접 import할 수 없습니다.
#    runtime/useSource.ts를 통해 사용하세요."
check "presence sources are React-free (purity contract)" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     -E \"(from ['\\\"]react['\\\"]|\\buse(State|Effect|Memo|Callback|Ref|LayoutEffect|SyncExternalStore)\\b|\\bsubscribeTick\\b)\" \
     src/shared/lib/presence/sources"

# 10. ledger_entries is append-only single entry point.
#     No direct INSERT/UPDATE/DELETE/UPSERT from app code.
check "no direct writes to ledger_entries (RPC only)" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     --exclude-dir=node_modules \
     -E \"\\.from\\(\\s*['\\\"]ledger_entries['\\\"]\\s*\\)\\s*\\.\\s*(insert|update|delete|upsert)\\b\" src"

# 11. Realtime channel per route — wallet/ledger realtime mounts only at __root.
check "useLedgerStream + ledger channel not used in routes" \
  "grep -RIn --include='*.tsx' --include='*.ts' \
     -E '(useLedgerStream\\(|\\.channel\\(.*ledger)' src/routes \
   | grep -v '__root.tsx'"

# 12. wallets is trigger-managed — never written directly.
check "no direct writes to wallets table" \
  "grep -RIn --include='*.ts' --include='*.tsx' \
     --exclude-dir=node_modules \
     -E \"\\.from\\(\\s*['\\\"]wallets['\\\"]\\s*\\)\\s*\\.\\s*(insert|update|delete|upsert)\\b\" src"


echo ""
if [ "$fail" -eq 0 ]; then
  echo "${GREEN}All guards passed.${NC}"
  exit 0
else
  echo "${RED}One or more guards failed.${NC}"
  exit 1
fi
