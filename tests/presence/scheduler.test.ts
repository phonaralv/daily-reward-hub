import { afterEach, describe, expect, it, vi } from "vitest";
import {
  subscribeTick,
  __getPresenceTickCount,
  __resetPresenceScheduler,
} from "@/shared/lib/presence/runtime/scheduler";

// jsdom provides requestAnimationFrame as a setTimeout polyfill. That is
// enough for contract tests — we don't assert on timing precision here,
// only on registration symmetry, visibility gating, and cleanup.

afterEach(() => {
  __resetPresenceScheduler();
  vi.restoreAllMocks();
});

describe("presence/scheduler", () => {
  it("subscribe/unsubscribe is symmetric — off() empties the tick set", () => {
    const off1 = subscribeTick(() => {});
    const off2 = subscribeTick(() => {});
    expect(__getPresenceTickCount()).toBe(2);
    off1();
    expect(__getPresenceTickCount()).toBe(1);
    off2();
    expect(__getPresenceTickCount()).toBe(0);
  });

  it("does not invoke tick callbacks while the document is hidden", async () => {
    const fn = vi.fn();
    const off = subscribeTick(fn);

    // Pretend the tab is in the background.
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });

    // Yield several macrotask cycles so jsdom's rAF polyfill fires at least
    // once. With visibility=hidden the loop must skip callbacks entirely.
    await new Promise((r) => setTimeout(r, 50));
    expect(fn).not.toHaveBeenCalled();

    off();
  });

  it("releases the rAF loop and visibilitychange listener when the last subscriber leaves", () => {
    const rafSpy = vi.spyOn(globalThis, "cancelAnimationFrame");
    const removeSpy = vi.spyOn(document, "removeEventListener");

    const off = subscribeTick(() => {});
    expect(__getPresenceTickCount()).toBe(1);

    off();
    expect(__getPresenceTickCount()).toBe(0);
    expect(rafSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });
});
