#!/usr/bin/env node
/**
 * PHONARA Aliveness Check — validates the 4 invariants from
 * docs/presence/ALIVENESS.md against a live preview URL.
 *
 * SSR parsing runs inside the browser page context using the real DOMParser
 * (Blink), so SSR and CSR snapshots are extracted by the SAME logic.
 *
 * Output: docs/presence/ALIVENESS_RUN.json + non-zero exit on failure.
 *
 * Usage:
 *   node scripts/aliveness-check.mjs [URL]
 *
 * Default URL: $PHONARA_ALIVENESS_URL or http://localhost:3000/
 *
 * Uses puppeteer-core + the system Chromium at /bin/chromium (or
 * $PHONARA_CHROMIUM_PATH). No browser download is required.
 */
import { writeFile, mkdir, access } from "node:fs/promises";
import { dirname } from "node:path";

const URL_ARG =
  process.argv[2] ||
  process.env.PHONARA_ALIVENESS_URL ||
  "http://localhost:3000/";
const OUT = "docs/presence/ALIVENESS_RUN.json";
const FIRST_PAINT_WAIT_MS = 1000;
const MUTATION_WINDOW_MS = 5000;
const LOCKSTEP_BUCKET_MS = 400;
const TRUTH_REGEX_SRC =
  "\\busername\\b|\\bwithdrew\\b|\\bwithdrawal\\b|earned\\s*[$\u20a9]|profit\\s*[$\u20a9]|\\bKRW\\s*\\d|\\bUSD\\s*\\d";

const CHROMIUM_PATH = process.env.PHONARA_CHROMIUM_PATH || "/bin/chromium";

let puppeteer;
try {
  puppeteer = (await import("puppeteer-core")).default;
} catch {
  console.error(
    "[aliveness] puppeteer-core not installed. Run: PUPPETEER_SKIP_DOWNLOAD=1 bun add -d puppeteer-core",
  );
  process.exit(2);
}

try {
  await access(CHROMIUM_PATH);
} catch {
  console.error(
    `[aliveness] Chromium not found at ${CHROMIUM_PATH}. Set PHONARA_CHROMIUM_PATH.`,
  );
  process.exit(2);
}

/**
 * Extractor source — injected verbatim into the page context so SSR and
 * CSR snapshots are produced by the SAME function running in Blink.
 */
const EXTRACTOR_SRC = `
function __phonaraNorm(s) {
  return (s == null ? "" : String(s))
    .normalize("NFKC")
    .replace(/[\\u200B-\\u200D\\uFEFF]/g, "")
    .replace(/\\s+/g, " ")
    .trim();
}
function __phonaraExtractPresenceSnapshot(root) {
  const nodes = root.querySelectorAll("[data-presence]");
  const out = [];
  const counters = Object.create(null);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const kind = node.getAttribute("data-presence") || "";
    const occurrence = (counters[kind] = (counters[kind] || 0) + 1) - 1;
    const rootValue = node.getAttribute("data-value");
    const descendant = node.querySelector("[data-value]");
    const descendantValue = descendant ? descendant.getAttribute("data-value") : null;
    const dataValue = rootValue != null ? rootValue : descendantValue;
    const textNodes = node.querySelectorAll("[data-presence-text]");
    let text;
    if (textNodes.length) {
      const parts = [];
      for (let j = 0; j < textNodes.length; j++) {
        parts.push(__phonaraNorm(textNodes[j].textContent || ""));
      }
      text = parts.join(" | ");
    } else {
      text = __phonaraNorm(node.textContent || "");
    }
    out.push({ index: i, occurrence, kind, dataValue, text });
  }
  return out;
}
`;

function compareSnapshots(ssr, csr) {
  const violations = [];
  const byKey = (arr) => {
    const m = new Map();
    for (const s of arr) m.set(`${s.kind}#${s.occurrence}`, s);
    return m;
  };
  const ssrMap = byKey(ssr);
  const csrMap = byKey(csr);
  const keys = new Set([...ssrMap.keys(), ...csrMap.keys()]);
  for (const key of keys) {
    const a = ssrMap.get(key);
    const b = csrMap.get(key);
    if (!a || !b) {
      violations.push({ key, reason: "presence node missing on one side", ssr: a, csr: b });
      continue;
    }
    if ((a.dataValue ?? null) !== (b.dataValue ?? null)) {
      violations.push({
        key,
        reason: "data-value mismatch",
        ssr: a.dataValue,
        csr: b.dataValue,
      });
    }
    if (a.text !== b.text) {
      violations.push({
        key,
        reason: "presence text mismatch",
        ssr: a.text,
        csr: b.text,
      });
    }
  }
  return violations;
}

async function main() {
  const ssrResp = await fetch(URL_ARG, { headers: { accept: "text/html" } });
  if (!ssrResp.ok) {
    throw new Error(`SSR fetch failed: ${ssrResp.status} ${ssrResp.statusText}`);
  }
  const ssrHtml = await ssrResp.text();

  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  // Inject the extractor into every page context (about:blank too).
  await page.evaluateOnNewDocument(EXTRACTOR_SRC);

  // Parse the SSR HTML inside a real browser context using DOMParser (Blink).
  await page.goto("about:blank");
  await page.evaluate(EXTRACTOR_SRC);
  const ssrSnap = await page.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    // eslint-disable-next-line no-undef
    return __phonaraExtractPresenceSnapshot(doc);
  }, ssrHtml);

  // Now load the real page for CSR snapshot.
  await page.goto(URL_ARG, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await new Promise((r) => setTimeout(r, FIRST_PAINT_WAIT_MS));
  await page.evaluate(EXTRACTOR_SRC);
  const csrSnap = await page.evaluate(() =>
    // eslint-disable-next-line no-undef
    __phonaraExtractPresenceSnapshot(document),
  );

  // Begin mutation observation for the next 5s.
  await page.evaluate((bucketMs) => {
    const w = window;
    w.__phonaraAlive = { mutations: [], t0: performance.now(), bucketMs };
    const norm = (s) =>
      (s == null ? "" : String(s))
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
          let before = "",
            after = "",
            field = "text";
          if (r.type === "attributes" && r.attributeName === "data-value") {
            before = r.oldValue ?? "";
            const target = r.target;
            after = target.getAttribute("data-value") ?? "";
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

  await new Promise((r) => setTimeout(r, MUTATION_WINDOW_MS));

  const mutations = await page.evaluate(() => window.__phonaraAlive.mutations);

  // Truth Boundary
  const truthRegex = new RegExp(TRUTH_REGEX_SRC, "i");
  const allText = [
    ...csrSnap.map((s) => `${s.text} ${s.dataValue ?? ""}`),
    ...mutations.map((m) => m.after || ""),
  ].join("\n");
  const truthMatch = allText.match(truthRegex);
  const truthFail = truthMatch ? { matched: truthMatch[0] } : null;

  // Invariant 1 — First Impression
  const firstImpressionViolations = compareSnapshots(ssrSnap, csrSnap);

  // Invariant 2 — Movement within 5s
  const movement = mutations.some(
    (m) =>
      (m.field === "data-value" && m.before !== m.after) ||
      (m.kind === "global-pulse" && m.field === "text" && m.after && m.after.length > 0),
  );

  // Invariant 3 — No Lockstep
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
    chromium: CHROMIUM_PATH,
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
    snapshots: { ssr: ssrSnap, csr: csrSnap },
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
