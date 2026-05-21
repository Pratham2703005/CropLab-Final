/**
 * ServerStatusProvider — polls the backend `/health` endpoint while the app is
 * open so the UI can react to the Render free-tier cold start (the backend
 * sleeps and takes ~30–60s to wake).
 *
 *   checking  → first poll in flight, no result yet
 *   waking    → polls failing — server asleep / cold-starting
 *   ready     → /health returned { status: "healthy" }
 *   degraded  → /health returned { status: "unhealthy" } (server up, GEE down)
 *   error     → 3-minute deadline passed without reaching the server
 *   stopped   → polling manually stopped by the user
 *
 * Status is surfaced as a banner on the dashboard (see ServerStatusBanner).
 * The shared type / context / hook live in ./serverStatus.
 */
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { ServerStatusContext } from './serverStatus';
import type { ServerStatusValue, ServerStatus } from '@/types';
import { DEADLINE_MS, POLL_BACKOFF_FACTOR, POLL_BASE_INTERVAL_MS, POLL_MAX_INTERVAL_MS, REQUEST_TIMEOUT_MS, SERVER_STATUS } from '@/constants';

export function ServerStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ServerStatus>(SERVER_STATUS.CHECKING);

  // All poll bookkeeping in refs so React StrictMode's double-mount can't
  // spawn two live pollers.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Current backoff delay; grows after each failed check, reset on (re)start.
  const pollDelayRef = useRef(POLL_BASE_INTERVAL_MS);
  // Forward ref so the scheduler can reach the latest checkHealth.
  const checkHealthRef = useRef<() => void>(() => {});
  const deadlineRef = useRef<number | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const stoppedRef = useRef(false);

  // Halt the poll mechanics (interval + in-flight request). Does not touch
  // `status` — callers set the appropriate status.
  const halt = useCallback(() => {
    stoppedRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
  }, []);

  // Queue the next health check after the current backoff delay, then grow
  // that delay (capped) so each retry waits exponentially longer.
  const scheduleNextPoll = useCallback(() => {
    if (stoppedRef.current) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      void checkHealthRef.current();
    }, pollDelayRef.current);
    pollDelayRef.current = Math.min(
      pollDelayRef.current * POLL_BACKOFF_FACTOR,
      POLL_MAX_INTERVAL_MS
    );
  }, []);

  const checkHealth = useCallback(async () => {
    if (stoppedRef.current) return;
    if (deadlineRef.current !== null && Date.now() > deadlineRef.current) {
      setStatus(SERVER_STATUS.ERROR);
      halt();
      return;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (stoppedRef.current) return;

      if (!res.ok) {
        // Server reachable but erroring (often mid-boot) — keep waking.
        setStatus(prev =>
          prev === SERVER_STATUS.READY || prev === SERVER_STATUS.DEGRADED ? prev : SERVER_STATUS.WAKING
        );
        scheduleNextPoll();
        return;
      }

      let body: { status?: string } = {};
      try {
        body = await res.json();
      } catch {
        // Non-JSON 200 — server responded, treat as healthy.
        body = { status: 'healthy' };
      }
      if (stoppedRef.current) return;

      if (body.status === 'healthy') {
        setStatus(SERVER_STATUS.READY);
        halt();
      } else {
        // Server up but GEE failed to initialise.
        setStatus(SERVER_STATUS.DEGRADED);
        halt();
      }
    } catch {
      // AbortError (timeout) or network failure — server still asleep.
      if (stoppedRef.current) return;
      setStatus(prev =>
        prev === SERVER_STATUS.READY || prev === SERVER_STATUS.DEGRADED ? prev : SERVER_STATUS.WAKING
      );
      scheduleNextPoll();
    } finally {
      clearTimeout(timeoutId);
    }
  }, [halt, scheduleNextPoll]);

  // Keep the forward ref pointed at the latest checkHealth so the scheduler
  // always calls the current closure.
  checkHealthRef.current = checkHealth;

  const runPoller = useCallback(() => {
    stoppedRef.current = false;
    deadlineRef.current = Date.now() + DEADLINE_MS;
    pollDelayRef.current = POLL_BASE_INTERVAL_MS; // reset backoff on (re)start
    checkHealth(); // fire immediately — checkHealth queues each retry
  }, [checkHealth]);

  useEffect(() => {
    runPoller();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      activeControllerRef.current?.abort();
    };
  }, [runPoller]);

  const stopPolling = useCallback(() => {
    halt();
    setStatus(SERVER_STATUS.STOPPED);
  }, [halt]);

  const startPolling = useCallback(() => {
    setStatus(SERVER_STATUS.CHECKING);
    runPoller();
  }, [runPoller]);

  const value = useMemo<ServerStatusValue>(
    () => ({
      status,
      isReady: status === SERVER_STATUS.READY || status === SERVER_STATUS.DEGRADED,
      isPolling: status === SERVER_STATUS.CHECKING || status === SERVER_STATUS.WAKING,
      stopPolling,
      startPolling,
    }),
    [status, stopPolling, startPolling]
  );

  return (
    <ServerStatusContext.Provider value={value}>
      {children}
    </ServerStatusContext.Provider>
  );
}
