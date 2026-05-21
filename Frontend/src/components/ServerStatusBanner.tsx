/**
 * Dashboard banner that surfaces the live backend wake-up state. Replaces
 * toast notifications — shows the current poll status with a Stop / Start
 * polling control. Renders nothing once the server is ready.
 */
import { AlertTriangle, Pause, Play } from 'lucide-react';
import { useServerStatus } from '@/contexts/serverStatus';
import type { ChipLabel } from '@/types/sidebar';
import { SERVER_STATUS } from '@/constants/server';
import { BUTTON_CLASSES, CHIP_LABELS, TONE_CLASSES } from '@/constants';
export function ServerStatusBanner() {
  const { status, isPolling, stopPolling, startPolling } = useServerStatus();

  if (status === 'ready') return null;

  // Tone + icon + message + action per status.
  let tone: ChipLabel ;
  let message: React.ReactNode;
  let showSpinner = false;

  if (status === SERVER_STATUS.CHECKING) {
    tone = CHIP_LABELS.AMBER;
    showSpinner = true;
    message = (
      <>
        Connecting to Server.
      </>
    );
  } else if (status === SERVER_STATUS.WAKING) {
    tone = CHIP_LABELS.AMBER;
    showSpinner = true;
    message = (
      <>
        Server is waking up, this can take up to 2 minutes. Try Showcase farms in the meantime. 
      </>
    );
  } else if (status === SERVER_STATUS.DEGRADED) {
    tone = CHIP_LABELS.ORANGE;
    message = (
      <>
        <span className='font-semibold'>Server is degraded.</span> Google Earth Engine Failed to start. This can happen if the server is overloaded. Try again later or contact support if the issue persists.
      </>
    );
  } else if (status === SERVER_STATUS.STOPPED) {
    tone = CHIP_LABELS.SLATE;
    message = (
      <>
        Server Connection stopped.
      </>
    );
  } else {
    // error
    tone = CHIP_LABELS.RED;
    message = (
      <>
        Unable to connect to the server. Please check your internet connection and try again. If the problem persists, contact support.
      </>
    );
  }

  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 animate-in ${TONE_CLASSES[tone]}`}
    >
      {showSpinner ? (
        <div className='h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70' />
      ) : (
        <AlertTriangle
          className={`h-5 w-5 flex-shrink-0 ${
            tone === CHIP_LABELS.SLATE ? 'opacity-50' : ''
          }`}
        />
      )}

      <p className='flex-1 text-sm'>{message}</p>

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
