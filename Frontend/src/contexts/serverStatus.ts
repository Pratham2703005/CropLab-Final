/**
 * Shared types, context object and hook for backend server status.
 * Kept separate from ServerStatusContext.tsx (which exports the provider
 * component) so React Fast Refresh works — a file must export only
 * components for Fast Refresh, so the hook/context live here.
 */
import { createContext, useContext } from 'react';

export type ServerStatus =
  | 'checking' // first poll in flight, no result yet
  | 'waking' // polls failing — server asleep / cold-starting
  | 'ready' // /health returned healthy
  | 'degraded' // /health returned unhealthy (server up, GEE down)
  | 'error' // 3-minute deadline passed without reaching the server
  | 'stopped'; // polling manually stopped by the user

export interface ServerStatusValue {
  status: ServerStatus;
  isReady: boolean;
  /** True while the poller is actively contacting the backend. */
  isPolling: boolean;
  /** Stop contacting the backend. */
  stopPolling: () => void;
  /** (Re)start polling the backend. */
  startPolling: () => void;
}

export const ServerStatusContext = createContext<ServerStatusValue | undefined>(
  undefined
);

export function useServerStatus(): ServerStatusValue {
  const ctx = useContext(ServerStatusContext);
  if (!ctx) {
    throw new Error(
      'useServerStatus must be used within a ServerStatusProvider'
    );
  }
  return ctx;
}
