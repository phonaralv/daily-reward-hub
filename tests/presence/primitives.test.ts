import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { LiveValue } from "@/shared/ui/presence/primitives/LiveValue";
import { LiveDot } from "@/shared/ui/presence/primitives/LiveDot";
import { LiveBadge } from "@/shared/ui/presence/primitives/LiveBadge";
import { LiveTicker } from "@/shared/ui/presence/primitives/LiveTicker";
import { LiveHeatCell } from "@/shared/ui/presence/primitives/LiveHeatCell";
import { __resetPresenceScheduler } from "@/shared/lib/presence/runtime/scheduler";
import { __resetTelemetry } from "@/shared/lib/presence/runtime/telemetry";

afterEach(() => {
  cleanup();
  __resetPresenceScheduler();
  __resetTelemetry();
});

describe("presence/primitives — SSR-safe contract", () => {
  it("LiveValue renders with data-presence + data-value on first paint", () => {
    const { container } = render(<LiveValue seed={1234} />);
    const el = container.querySelector('[data-presence="live-value"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-value")).toBe("1234");
  });

  it("LiveDot renders with data-presence=online-dot and a deterministic value", () => {
    const { container } = render(<LiveDot />);
    const el = container.querySelector('[data-presence="online-dot"]');
    expect(el).not.toBeNull();
    expect(["online", "idle"]).toContain(el?.getAttribute("data-value"));
  });

  it("LiveBadge renders with data-presence=reward-wave on first paint", () => {
    const { container } = render(<LiveBadge />);
    const el = container.querySelector('[data-presence="reward-wave"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-value")).toBe("calm");
  });

  it("LiveTicker renders 5 deterministic items on first paint", () => {
    const { container } = render(<LiveTicker />);
    const el = container.querySelector('[data-presence="ticker"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute("data-value")?.split(",").length).toBe(5);
  });

  it("LiveHeatCell renders with data-presence=heat-cell and a numeric value", () => {
    const { container } = render(<LiveHeatCell regionId="seoul" />);
    const el = container.querySelector('[data-presence="heat-cell"]');
    expect(el).not.toBeNull();
    expect(Number.isFinite(Number(el?.getAttribute("data-value")))).toBe(true);
  });
});
