/**
 * Dashboard banner that surfaces the live backend wake-up state. Replaces
 * toast notifications — shows the current poll status with a Stop / Start
 * polling control. Renders nothing once the server is ready.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, Pause, Play } from 'lucide-react';
import { useServerStatus } from '@/contexts/serverStatus';
import {
  BUTTON_CLASSES,
  SERVER_BANNER_DELAY_MS,
  SERVER_STATUS,
  SERVER_STATUS_BANNER,
  SERVER_TONE,
  TONE_CLASSES,
} from '@/constants';
export function ServerStatusBanner() {
  const { status, isPolling, stopPolling, startPolling } = useServerStatus();

  // Grace period: stay hidden briefly so a fast (warm) server that reaches
  // `ready` within the window never flashes the banner.
  const [delayElapsed, setDelayElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(
      () => setDelayElapsed(true),
      SERVER_BANNER_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, []);

  if (status === SERVER_STATUS.READY || !delayElapsed) return null;

  const { tone, showSpinner, lead, message } = SERVER_STATUS_BANNER[status];

  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 animate-in ${TONE_CLASSES[tone]}`}
    >
      {showSpinner ? (
        <div className='h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70' />
      ) : (
        <AlertTriangle
          className={`h-5 w-5 flex-shrink-0 ${
            tone === SERVER_TONE.SLATE ? 'opacity-50' : ''
          }`}
        />
      )}

      <p className='flex-1 text-sm'>
        {lead ? (
          <>
            <span className='font-semibold'>{lead}</span> {message}
          </>
        ) : (
          message
        )}
      </p>

      {isPolling ? (
        <button
          onClick={stopPolling}
          className={`inline-flex flex-shrink-0 items-center rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold transition-colors ${BUTTON_CLASSES[tone]}`}
        >
          <Pause className='mr-1.5 h-3.5 w-3.5' />
          Stop polling
        </button>
      ) : (
        <button
          onClick={startPolling}
          className={`inline-flex flex-shrink-0 items-center rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold transition-colors ${BUTTON_CLASSES[tone]}`}
        >
          <Play className='mr-1.5 h-3.5 w-3.5' />
          Start polling
        </button>
      )}
    </div>
  );
}
