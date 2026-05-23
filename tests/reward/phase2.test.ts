/**
 * Phase 2 — Streak + Quest invariants (static + behavior guards).
 *
 * NO DB ROUNDTRIPS. We assert source-tree invariants that make the
 * single-entry-point contract structurally impossible to bypass.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  pushRewardClaim,
  rewardClaimSource,
  __resetRewardClaimSource,
} from "@/shared/lib/presence/sources/rewardClaimSource";
import { PRESENCE_SOURCE_KEYS } from "@/shared/lib/presence/sources";

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

describe("phase 2 — single entry point still holds", () => {
  it("no direct write to user_quests / streaks from app code", () => {
    const offenders: string[] = [];
    const re =
      /\.from\(\s*["'](user_quests|streaks)["']\s*\)\s*\.\s*(insert|update|delete|upsert)\b/;
    for (const f of FILES) {
      if (re.test(readFileSync(f, "utf8"))) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("quest writes go through RPC only", () => {
    const code = readFileSync(
      resolve(__dirname, "../../src/lib/quest.functions.ts"),
      "utf8",
    );
    expect(code).toMatch(/supabase\.rpc\(\s*["']progress_quest["']/);
    expect(code).toMatch(/supabase\.rpc\(\s*["']claim_quest["']/);
    expect(code).not.toMatch(/\.from\(\s*["']ledger_entries["']/);
    expect(code).not.toMatch(/\.from\(\s*["']wallets["']/);
  });

  it("daily reward writes go through RPC only", () => {
    const code = readFileSync(
      resolve(__dirname, "../../src/lib/daily-reward.functions.ts"),
      "utf8",
    );
    expect(code).toMatch(/supabase\.rpc\(\s*["']claim_daily_reward["']/);
    expect(code).not.toMatch(/\.from\(/);
  });
});

describe("phase 2 — realtime mount discipline (Guard #11)", () => {
  it("useLedgerStream is mounted only in __root.tsx", () => {
    const routesDir = resolve(__dirname, "../../src/routes");
    const offenders: string[] = [];
    for (const f of walk(routesDir)) {
      if (f.endsWith("__root.tsx")) continue;
      const code = readFileSync(f, "utf8");
      if (/\buseLedgerStream\s*\(/.test(code)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("supabase.channel('ledger... is not used in route files", () => {
    const routesDir = resolve(__dirname, "../../src/routes");
    const offenders: string[] = [];
    for (const f of walk(routesDir)) {
      if (f.endsWith("__root.tsx")) continue;
      const code = readFileSync(f, "utf8");
      if (/\.channel\([^)]*ledger/.test(code)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

describe("phase 2 — PresenceSource registry", () => {
  it("registers walletBalance + rewardClaim keys", () => {
    expect(PRESENCE_SOURCE_KEYS.walletBalance).toBe("wallet-balance");
    expect(PRESENCE_SOURCE_KEYS.rewardClaim).toBe("reward-claim");
  });

  it("source modules are React-free", () => {
    const wallet = readFileSync(
      resolve(__dirname, "../../src/shared/lib/presence/sources/walletBalanceSource.ts"),
      "utf8",
    );
    const reward = readFileSync(
      resolve(__dirname, "../../src/shared/lib/presence/sources/rewardClaimSource.ts"),
      "utf8",
    );
    const re =
      /from\s+["']react["']|\buse(State|Effect|Memo|Callback|Ref|LayoutEffect|SyncExternalStore)\b/;
    expect(re.test(wallet)).toBe(false);
    expect(re.test(reward)).toBe(false);
  });
});

describe("phase 2 — rewardClaimSource behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    __resetRewardClaimSource();
  });
  afterEach(() => {
    vi.useRealTimers();
    __resetRewardClaimSource();
  });

  it("push notifies subscribers and exposes current", () => {
    const src = rewardClaimSource();
    const seen: (ReturnType<typeof src.get>)[] = [];
    const unsub = src.subscribe((c) => seen.push(c));
    pushRewardClaim({
      kind: "daily_reward",
      amount: 100,
      refKind: "daily_reward",
      refId: "daily:2026-05-23",
    });
    expect(src.get()?.amount).toBe(100);
    expect(seen[0]?.amount).toBe(100);
    unsub();
  });

  it("fades back to null after 30s", () => {
    const src = rewardClaimSource();
    pushRewardClaim({
      kind: "quest_reward",
      amount: 50,
      refKind: "quest",
      refId: "first_daily_claim",
    });
    expect(src.get()).not.toBeNull();
    vi.advanceTimersByTime(30_001);
    expect(src.get()).toBeNull();
  });
});
