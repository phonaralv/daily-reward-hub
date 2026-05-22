import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
/* eslint-disable no-restricted-syntax */
import { supabase } from "@/integrations/supabase/client";

type Handler = (payload: unknown) => void;

interface ChannelEntry {
  channel: RealtimeChannel;
  refCount: number;
  handlers: Set<Handler>;
}

const registry = new Map<string, ChannelEntry>();

/**
 * Single realtime channel manager. Direct `supabase.channel(` is blocked by ESLint
 * everywhere else. RefCounted, handlers throttled at 200ms, paused on hidden tab.
 */
export function useRealtimeChannel(
  opts: { scope: string; key: string; event?: string; table?: string; filter?: string },
  handler: Handler,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const channelKey = `${opts.scope}:${opts.key}`;
    let entry = registry.get(channelKey);

    let lastFire = 0;
    const throttled: Handler = (payload) => {
      const now = Date.now();
      if (now - lastFire < 200) return;
      lastFire = now;
      if (document.hidden) return;
      handlerRef.current(payload);
    };

    if (!entry) {
      const channel = supabase.channel(channelKey);
      if (opts.table) {
        channel.on(
          // @ts-expect-error supabase types are wide here
          "postgres_changes",
          {
            event: opts.event ?? "*",
            schema: "public",
            table: opts.table,
            ...(opts.filter ? { filter: opts.filter } : {}),
          },
          (payload: unknown) => {
            entry?.handlers.forEach((h) => h(payload));
          },
        );
      } else {
        channel.on("broadcast", { event: opts.event ?? "*" }, (payload: unknown) => {
          entry?.handlers.forEach((h) => h(payload));
        });
      }
      channel.subscribe();
      entry = { channel, refCount: 0, handlers: new Set() };
      registry.set(channelKey, entry);
    }

    entry.refCount += 1;
    entry.handlers.add(throttled);

    return () => {
      const e = registry.get(channelKey);
      if (!e) return;
      e.handlers.delete(throttled);
      e.refCount -= 1;
      if (e.refCount <= 0) {
        supabase.removeChannel(e.channel);
        registry.delete(channelKey);
      }
    };
  }, [opts.scope, opts.key, opts.event, opts.table, opts.filter]);
}
