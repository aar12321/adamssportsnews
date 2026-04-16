import { useEffect, useRef } from "react";

// -----------------------------------------------------------------------------
// Hook: subscribe to our SSE broadcast channel.
//
// Usage:
//   useLiveStream(['scores:basketball'], {
//     score: (s) => updateScoreInState(s),
//     'score-finished': (s) => removeScore(s.id),
//   });
//
// The EventSource is kept open for the component's lifetime and auto-
// reconnects on network blips (built into the browser API). Topic changes
// reopen the connection. All handlers live in a ref so the component
// doesn't re-subscribe on every render.
// -----------------------------------------------------------------------------

export type LiveStreamHandlers = Record<string, (data: any) => void>;

export function useLiveStream(
  topics: string[],
  handlers: LiveStreamHandlers,
  enabled: boolean = true,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Build a stable topic string so the effect doesn't reconnect on every
  // render if the array identity changes but the contents don't.
  const topicKey = topics.slice().sort().join(",");

  useEffect(() => {
    if (!enabled || !topicKey) return;
    const url = `/api/stream?topic=${encodeURIComponent(topicKey)}`;
    const src = new EventSource(url, { withCredentials: true });

    // Grab the list of distinct event names the consumer cares about so we
    // register a listener per type. Unknown events are ignored.
    const eventNames = Object.keys(handlersRef.current);
    const listeners: Record<string, (ev: MessageEvent) => void> = {};
    for (const name of eventNames) {
      const fn = (ev: MessageEvent) => {
        const cb = handlersRef.current[name];
        if (!cb) return;
        try {
          cb(JSON.parse(ev.data));
        } catch {
          cb(ev.data);
        }
      };
      listeners[name] = fn;
      src.addEventListener(name, fn as EventListener);
    }

    return () => {
      for (const name of eventNames) {
        src.removeEventListener(name, listeners[name] as EventListener);
      }
      src.close();
    };
  }, [topicKey, enabled]);
}
