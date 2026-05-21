/**
 * Shared types, context object and hook for backend server status.
 * Kept separate from ServerStatusContext.tsx (which exports the provider
 * component) so React Fast Refresh works — a file must export only
 * components for Fast Refresh, so the hook/context live here.
 */
import type { ServerStatusValue } from '@/types';
import { createContext, useContext } from 'react';

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
