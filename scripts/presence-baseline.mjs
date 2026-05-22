#!/usr/bin/env node
/**
 * PHONARA Presence Baseline measurement.
 *
 * Spawns headless Chromium under 3 profiles and records:
 *  - longtasks (count, total duration)
 *  - requestAnimationFrame call count
 *  - setTimeout call count
 *  - INP-approximate event durations
 *
 * Output: docs/presence/BASELINE.json
 *
 * Usage:
 *   node scripts/presence-baseline.mjs [URL]
 *
 * Default URL: $PHONARA_BASELINE_URL or http://localhost:3000/
 *
 * Requires playwright at runtime: `bun add -d playwright`
 * (Skipped automatically if playwright is not installed — exits with note.)
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const URL_ARG = process.argv[2] || process.env.PHONARA_BASELINE_URL || "http://localhost:3000/";
const OUT = "docs/presence/BASELINE.json";
const SAMPLE_MS = 30_000;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error(
    "[baseline] playwright not installed. Run: bun add -d playwright && bunx playwright install chromium"
  );
  process.exit(2);
}

const profiles = [
  { name: "desktop-default", cpu: 1, network: null },
  { name: "low-android-cpu4x-slow3g", cpu: 4, network: { downloadThroughput: 50_000, uploadThroughput: 25_000, latency: 400 } },
  { name: "limit-cpu6x-offline-after-load", cpu: 6, network: null, offlineAfterLoad: true },
];

async function runProfile(profile) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);

  await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
  if (profile.network) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: profile.network.latency,
      downloadThroughput: profile.network.downloadThroughput,
      uploadThroughput: profile.network.uploadThroughput,
    });
  }

  await page.goto(URL_ARG, { waitUntil: "domcontentloaded", timeout: 60_000 });

  if (profile.offlineAfterLoad) {
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0,
    });
  }

  await page.evaluate(() => {
    const w = window;
    w.__phonaraMetrics = { longtasks: [], events: [], raf: 0, setTimeout: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          w.__phonaraMetrics.longtasks.push({ d: e.duration, t: e.startTime });
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.duration >= 16) w.__phonaraMetrics.events.push({ name: e.name, d: e.duration });
        }
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    } catch {}
    const _raf = w.requestAnimationFrame;
    w.requestAnimationFrame = function (cb) {
      w.__phonaraMetrics.raf++;
      return _raf.call(w, cb);
    };
    const _st = w.setTimeout;
    w.setTimeout = function (...args) {
      w.__phonaraMetrics.setTimeout++;
      return _st.apply(w, args);
    };
  });

  await page.waitForTimeout(SAMPLE_MS);

  const metrics = await page.evaluate(() => {
    const m = window.__phonaraMetrics || {};
    const longtaskTotal = (m.longtasks || []).reduce((a, b) => a + b.d, 0);
    const inpMax = (m.events || []).reduce((a, b) => Math.max(a, b.d), 0);
    return {
      longtaskCount: (m.longtasks || []).length,
      longtaskTotalMs: Math.round(longtaskTotal),
      inpApproxMaxMs: Math.round(inpMax),
      rafCount: m.raf || 0,
      setTimeoutCount: m.setTimeout || 0,
    };
  });

  await browser.close();
  return { profile: profile.name, sampleMs: SAMPLE_MS, ...metrics };
}

const results = [];
for (const p of profiles) {
  console.log(`[baseline] ${p.name} …`);
  try {
    results.push(await runProfile(p));
  } catch (e) {
    results.push({ profile: p.name, error: String(e) });
  }
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(
  OUT,
  JSON.stringify(
    { url: URL_ARG, generatedAt: new Date().toISOString(), profiles: results },
    null,
    2
  )
);
console.log(`[baseline] wrote ${OUT}`);
