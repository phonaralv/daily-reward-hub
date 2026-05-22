#!/usr/bin/env node
/**
 * PHONARA Aliveness Check — validates the 4 invariants from
 * docs/presence/ALIVENESS.md against a live preview URL.
 *
 * Output: docs/presence/ALIVENESS_RUN.json + non-zero exit on failure.
 *
 * Usage:
 *   node scripts/aliveness-check.mjs [URL]
 *
 * Default URL: $PHONARA_ALIVENESS_URL or http://localhost:3000/
 *
 * Requires playwright at runtime.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const URL_ARG = process.argv[2] || process.env.PHONARA_ALIVENESS_URL || "http://localhost:3000/";
const OUT = "docs/presence/ALIVENESS_RUN.json";
const FIRST_PAINT_WAIT_MS = 1000;
const MUTATION_WINDOW_MS = 5000;
const LOCKSTEP_BUCKET_MS = 400;
const TRUTH_REGEX =
  /\busername\b|\bwithdrew\b|\bwithdrawal\b|earned\s*[$₩]|profit\s*[$₩]|\bKRW\s*\d|\bUSD\s*\d/i;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "[aliveness] playwright not installed. Run: bun add -d playwright && bunx playwright install chromium"
  );
  process.exit(2);
}

const norm = (s) =>
  (s ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function extractFromHtml(html) {
  const out = [];
  const re = /<([a-z][a-z0-9-]*)\b([^>]*\bdata-presence=("[^"]*"|'[^']*'))([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const attrs = m[2] + m[4];
    const kindMatch = /data-presence=("([^"]*)"|'([^']*)')/i.exec(attrs);
    const valMatch = /data-value=("([^"]*)"|'([^']*)')/i.exec(attrs);
    const kind = (kindMatch?.[2] ?? kindMatch?.[3] ?? "").trim();
    const dataValue = valMatch ? (valMatch[2] ?? valMatch[3] ?? "") : null;
    const inner = m[5];
    const textMatches = [...inner.matchAll(/<[^>]*\bdata-presence-text\b[^>]*>([\s\S]*?)<\//gi)]
      .map((mm) => norm(mm[1].replace(/<[^>]+>/g, "")));
    const text = textMatches.join(" | ");
    out.push({ kind, dataValue, text });
  }
  return out;
}

async function snapshotDom(page) {
  return page.$$eval("[data-presence]", (nodes) => {
    const norm = (s) =>
      (s ?? "")
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return nodes.map((n) => {
      const kind = n.getAttribute("data-presence") || "";
      const dataValue = n.getAttribute("data-value");
      const textNodes = n.querySelectorAll("[data-presence-text]");
      const text = textNodes.length
        ? [...textNodes].map((t) => norm(t.textContent || "")).join(" | ")
        : norm(n.textContent || "");
      return { kind, dataValue, text };
    });
  });
}

function compareSnapshots(ssr, csr) {
  const violations = [];
  const ssrByKind = new Map();
  for (const s of ssr) {
    const list = ssrByKind.get(s.kind) || [];
    list.push(s);
    ssrByKind.set(s.kind, list);
  }
  const csrByKind = new Map();
  for (const c of csr) {
    const list = csrByKind.get(c.kind) || [];
    list.push(c);
    csrByKind.set(c.kind, list);
  }
  const kinds = new Set([...ssrByKind.keys(), ...csrByKind.keys()]);
  for (const kind of kinds) {
    const a = ssrByKind.get(kind) || [];
    const b = csrByKind.get(kind) || [];
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const sa = a[i];
      const sb = b[i];
      if (!sa || !sb) {
        violations.push({ kind, index: i, reason: "presence node count mismatch", ssr: sa, csr: sb });
        continue;
      }
      if ((sa.dataValue ?? null) !== (sb.dataValue ?? null)) {
        violations.push({ kind, index: i, reason: "data-value mismatch", ssr: sa.dataValue, csr: sb.dataValue });
      }
      if (sa.text !== sb.text) {
        violations.push({ kind, index: i, reason: "presence text mismatch", ssr: sa.text, csr: sb.text });
      }
    }
  }
  return violations;
}

async function main() {
  const ssrHtml = await fetch(URL_ARG, { headers: { accept: "text/html" } }).then((r) => r.text());
  const ssrSnap = extractFromHtml(ssrHtml);

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(URL_ARG, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(FIRST_PAINT_WAIT_MS);
  const csrSnap = await snapshotDom(page);

  // Begin mutation observation for the next 5s.
  await page.evaluate((bucketMs) => {
    const w = window;
    w.__phonaraAlive = { mutations: [], t0: performance.now(), bucketMs };
    const norm = (s) =>
      (s ?? "")
        .normalize("NFKC")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const targets = document.querySelectorAll("[data-presence]");
    targets.forEach((node) => {
      const kind = node.getAttribute("data-presence") || "";
      const observer = new MutationObserver((records) => {
        const ts = performance.now() - w.__phonaraAlive.t0;
        for (const r of records) {
          let before = "", after = "", field = "text";
          if (r.type === "attributes" && r.attributeName === "data-value") {
            before = r.oldValue ?? "";
            after = node.getAttribute("data-value") ?? "";
            field = "data-value";
          } else {
            const tn = node.querySelector("[data-presence-text]");
            after = norm(tn ? tn.textContent || "" : node.textContent || "");
            before = "";
            field = "text";
          }
          w.__phonaraAlive.mutations.push({ ts, kind, field, before, after });
        }
      });
      observer.observe(node, {
        subtree: true,
        characterData: true,
        childList: true,
        attributes: true,
        attributeFilter: ["data-value"],
        attributeOldValue: true,
      });
    });
  }, LOCKSTEP_BUCKET_MS);

  await page.waitForTimeout(MUTATION_WINDOW_MS);

  const mutations = await page.evaluate(() => window.__phonaraAlive.mutations);

  // Truth Boundary: scan all visible presence text (CSR snapshot + mutation after-values).
  const allText = [
    ...csrSnap.map((s) => `${s.text} ${s.dataValue ?? ""}`),
    ...mutations.map((m) => m.after || ""),
  ].join("\n");
  const truthMatch = allText.match(TRUTH_REGEX);
  const truthFail = truthMatch
    ? { matched: truthMatch[0] }
    : null;

  // Invariant 1
  const firstImpressionViolations = compareSnapshots(ssrSnap, csrSnap);

  // Invariant 2
  const movement = mutations.some(
    (m) =>
      (m.field === "data-value" && m.before !== m.after) ||
      (m.kind === "global-pulse" && m.field === "text" && m.after && m.after.length > 0)
  );

  // Invariant 3
  const buckets = new Map();
  for (const m of mutations) {
    const bucket = Math.floor(m.ts / LOCKSTEP_BUCKET_MS);
    const set = buckets.get(bucket) || new Set();
    set.add(m.kind);
    buckets.set(bucket, set);
  }
  const lockstepBuckets = [...buckets.entries()]
    .filter(([, kinds]) => kinds.size >= 2)
    .map(([b, kinds]) => ({ bucket: b, kinds: [...kinds] }));

  const result = {
    url: URL_ARG,
    generatedAt: new Date().toISOString(),
    ssrSnapshotCount: ssrSnap.length,
    csrSnapshotCount: csrSnap.length,
    invariants: {
      firstImpression: {
        pass: firstImpressionViolations.length === 0,
        violations: firstImpressionViolations,
      },
      movementWithin5s: {
        pass: movement,
        observedMutations: mutations.length,
      },
      noLockstep: {
        pass: lockstepBuckets.length === 0,
        offendingBuckets: lockstepBuckets,
      },
      truthBoundary: {
        pass: truthFail === null,
        match: truthFail,
      },
    },
    mutations,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(result, null, 2));
  await browser.close();

  const inv = result.invariants;
  const allPass =
    inv.firstImpression.pass &&
    inv.movementWithin5s.pass &&
    inv.noLockstep.pass &&
    inv.truthBoundary.pass;
  for (const [k, v] of Object.entries(inv)) {
    console.log(`[aliveness] ${k}: ${v.pass ? "PASS" : "FAIL"}`);
  }
  console.log(`[aliveness] wrote ${OUT}`);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
