import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Subscribe to Supabase Realtime changes on any `sports_*` table.
//
// Usage:
//   useRealtimeTable("sports_fantasy_matchups", {
//     filter: `league_id=eq.${leagueId}`,
//     onInsert: (row) => queryClient.invalidateQueries(...),
//     onUpdate: (row) => queryClient.invalidateQueries(...),
//   });
//
// The hook opens one Postgres Changes channel, scoped by a row-level filter
// (optional). It cleans up on unmount or when deps change. Callbacks live in
// a ref so re-subscribing on every render is avoided.
// -----------------------------------------------------------------------------

interface RealtimeOpts {
  filter?: string;
  onInsert?: (newRow: Record<string, any>) => void;
  onUpdate?: (newRow: Record<string, any>, oldRow: Record<string, any>) => void;
  onDelete?: (oldRow: Record<string, any>) => void;
  enabled?: boolean;
}

export function useRealtimeTable(table: string, opts: RealtimeOpts): void {
  const cbRef = useRef(opts);
  cbRef.current = opts;

  const enabled = opts.enabled !== false;
  const filterKey = opts.filter ?? "";

  useEffect(() => {
    if (!enabled) return;

    const channelName = `rt:${table}:${filterKey}`;
    const pgOpts: Record<string, string> = {
      event: "*",
      schema: "public",
      table,
    };
    if (filterKey) pgOpts.filter = filterKey;

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on("postgres_changes", pgOpts as any, (payload: any) => {
        const cb = cbRef.current;
        switch (payload.eventType) {
          case "INSERT":
            cb.onInsert?.(payload.new);
            break;
          case "UPDATE":
            cb.onUpdate?.(payload.new, payload.old);
            break;
          case "DELETE":
            cb.onDelete?.(payload.old);
            break;
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filterKey, enabled]);
}
