/**
 * Dashboard banner that surfaces the live backend wake-up state. Replaces
 * toast notifications — shows the current poll status with a Stop / Start
 * polling control. Renders nothing once the server is ready.
 */
import { AlertTriangle, Pause, Play } from 'lucide-react';
import { useServerStatus } from '@/contexts/serverStatus';

export function ServerStatusBanner() {
  const { status, isPolling, stopPolling, startPolling } = useServerStatus();

  if (status === 'ready') return null;

  // Tone + icon + message + action per status.
  let tone: 'amber' | 'orange' | 'red' | 'slate';
  let message: React.ReactNode;
  let showSpinner = false;

  if (status === 'checking') {
    tone = 'amber';
    showSpinner = true;
    message = (
      <>
        Connecting to Server.
      </>
    );
  } else if (status === 'waking') {
    tone = 'amber';
    showSpinner = true;
    message = (
      <>
        Server is waking up, this can take up to 2 minutes. Try Showcase farms in the meantime. 
      </>
    );
  } else if (status === 'degraded') {
    tone = 'orange';
    message = (
      <>
        <span className='font-semibold'>Server is degraded.</span> Google Earth Engine Failed to start. This can happen if the server is overloaded. Try again later or contact support if the issue persists.
      </>
    );
  } else if (status === 'stopped') {
    tone = 'slate';
    message = (
      <>
        Server Connection stopped.
      </>
    );
  } else {
    // error
    tone = 'red';
    message = (
      <>
        Unable yo connect to the server. Please check your internet connection and try again. If the problem persists, contact support.
      </>
    );
  }

  const toneClasses: Record<typeof tone, string> = {
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    orange: 'border-orange-200 bg-orange-50 text-orange-800',
    red: 'border-red-200 bg-red-50 text-red-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  const buttonClasses: Record<typeof tone, string> = {
    amber: 'border-amber-300 text-amber-800 hover:bg-amber-100',
    orange: 'border-orange-300 text-orange-800 hover:bg-orange-100',
    red: 'border-red-300 text-red-700 hover:bg-red-100',
    slate: 'border-slate-300 text-slate-700 hover:bg-slate-100',
  };

  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 animate-in ${toneClasses[tone]}`}
    >
      {showSpinner ? (
        <div className='h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70' />
      ) : (
        <AlertTriangle
          className={`h-5 w-5 flex-shrink-0 ${
            tone === 'slate' ? 'opacity-50' : ''
          }`}
        />
      )}

      <p className='flex-1 text-sm'>{message}</p>

      {isPolling ? (
        <button
          onClick={stopPolling}
          className={`inline-flex flex-shrink-0 items-center rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold transition-colors ${buttonClasses[tone]}`}
        >
          <Pause className='mr-1.5 h-3.5 w-3.5' />
          Stop polling
        </button>
      ) : (
        <button
          onClick={startPolling}
          className={`inline-flex flex-shrink-0 items-center rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold transition-colors ${buttonClasses[tone]}`}
        >
          <Play className='mr-1.5 h-3.5 w-3.5' />
          Start polling
        </button>
      )}
    </div>
  );
}
