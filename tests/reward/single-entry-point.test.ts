/**
 * Phase 1 — Reward Loop Core invariants (static guards).
 *
 * These tests do NOT hit the database. They assert source-tree invariants
 * about the single entry point for reward credits:
 *
 *   - `wallets` table is never written from app code (no UPDATE/INSERT).
 *   - `ledger_entries` is append-only — no UPDATE/DELETE in code.
 *   - `ledger_entries` INSERT may only happen inside RPCs
 *     (`supabase.rpc('claim_*')`) — never from `.from('ledger_entries').insert`.
 *
 * If any of these fails, a future refactor has broken the single-entry-point
 * contract. Fix the offending file (use the `claim_daily_reward` RPC pattern)
 * before merging.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve(__dirname, "../../src");

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}

const FILES = [...walk(SRC)].filter(
  (f) =>
    !f.includes("/integrations/supabase/types.ts") &&
    !f.endsWith(".test.ts") &&
    !f.endsWith(".test.tsx"),
);

describe("reward loop — single entry point", () => {
  it("no code writes directly to `wallets`", () => {
    const offenders: string[] = [];
    const re =
      /\.from\(\s*["']wallets["']\s*\)\s*\.\s*(insert|update|delete|upsert)\b/;
    for (const f of FILES) {
      if (re.test(readFileSync(f, "utf8"))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("no code UPDATE/DELETE/UPSERT on `ledger_entries`", () => {
    const offenders: string[] = [];
    const re =
      /\.from\(\s*["']ledger_entries["']\s*\)\s*\.\s*(update|delete|upsert)\b/;
    for (const f of FILES) {
      if (re.test(readFileSync(f, "utf8"))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("no direct INSERT into `ledger_entries` — only RPC path allowed", () => {
    const offenders: string[] = [];
    const re = /\.from\(\s*["']ledger_entries["']\s*\)\s*\.\s*insert\b/;
    for (const f of FILES) {
      if (re.test(readFileSync(f, "utf8"))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

describe("reward loop — surface coverage", () => {
  it("exposes WalletDTO + WALLET_QK", async () => {
    const mod = await import("@/entities/wallet");
    expect(mod.WALLET_QK).toBeDefined();
    expect(typeof mod.useWallet).toBe("function");
  });

  it("exposes LedgerEntryDTO surface + LEDGER_QK", async () => {
    const mod = await import("@/entities/ledger");
    expect(mod.LEDGER_QK).toBeDefined();
    expect(typeof mod.useLedger).toBe("function");
  });
});
