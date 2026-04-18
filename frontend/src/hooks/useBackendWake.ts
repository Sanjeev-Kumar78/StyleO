import { useEffect } from "react";

const WAKE_URL =
  "https://9qk1chspm2.execute-api.us-east-2.amazonaws.com/prod/wake";

// Maximum time to keep retrying (ms) — stop after 5 minutes
const MAX_RETRY_MS = 5 * 60 * 1000;

/**
 * useBackendWake
 *
 * Fires a GET request to the Lambda /wake endpoint on every app mount.
 * - If the EC2 is already running  → 200, nothing more to do.
 * - If the EC2 is stopped          → Lambda starts it and returns 202
 *   with a Retry-After header.  We keep polling until we get a 200 or
 *   the MAX_RETRY_MS budget is exhausted.
 *
 * This runs entirely in the background — no UI is blocked or shown.
 * The hook is intentionally fire-and-forget; errors are swallowed
 * silently so a Lambda outage never breaks the rest of the app.
 */
export default function useBackendWake(): void {
  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function ping(): Promise<void> {
      if (cancelled) return;

      try {
        const res = await fetch(WAKE_URL, { method: "GET" });

        if (cancelled) return;

        if (res.status === 200) {
          // EC2 is running — nothing more to do.
          return;
        }

        if (res.status === 202) {
          // EC2 is starting up; respect Retry-After if present.
          const retryAfter = parseInt(res.headers.get("Retry-After") ?? "30", 10);
          const elapsed = Date.now() - started;

          if (elapsed + retryAfter * 1000 < MAX_RETRY_MS) {
            setTimeout(ping, retryAfter * 1000);
          }
        }
        // Any other status (4xx, 5xx) — give up silently.
      } catch {
        // Network error or Lambda unreachable — give up silently.
      }
    }

    // Fire immediately on mount without blocking the render.
    ping();

    return () => {
      cancelled = true;
    };
  }, []); // run once per app mount
}
