/**
 * Dashboard banner that surfaces the live backend wake-up state. Replaces
 * toast notifications — shows the current poll status (attempts, last check),
 * with a Stop / Start polling control. Renders nothing once the server is
 * ready.
 */
import { AlertTriangle, Pause, Play } from 'lucide-react';
import { useServerStatus } from '@/contexts/serverStatus';

const fmtTime = (ts: number | null): string =>
  ts ? new Date(ts).toLocaleTimeString() : '—';

const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? '' : 's'}`;

export function ServerStatusBanner() {
  const { status, attempts, lastCheckAt, isPolling, stopPolling, startPolling } =
    useServerStatus();

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
        <span className='font-semibold'>Contacting the backend…</span> Sending
        the first health check.
      </>
    );
  } else if (status === 'waking') {
    tone = 'amber';
    showSpinner = true;
    message = (
      <>
        <span className='font-semibold'>Backend hasn't woken up yet.</span>{' '}
        {plural(attempts, 'health check')} failed — last checked{' '}
        {fmtTime(lastCheckAt)}. It's on Render's free tier (~30–60s to wake);
        retrying every 5s. Showcase farms work now.
      </>
    );
  } else if (status === 'degraded') {
    tone = 'orange';
    message = (
      <>
        <span className='font-semibold'>Backend is degraded.</span> The server
        responded but its satellite engine failed to start — heatmap
        generation may not work.
      </>
    );
  } else if (status === 'stopped') {
    tone = 'slate';
    message = (
      <>
        <span className='font-semibold'>Health polling stopped.</span> The
        backend is not being contacted
        {attempts > 0
          ? ` (${plural(attempts, 'check')} made, last ${fmtTime(lastCheckAt)})`
          : ''}
        . Your own farms stay locked until you resume.
      </>
    );
  } else {
    // error
    tone = 'red';
    message = (
      <>
        <span className='font-semibold'>Backend unreachable.</span> Gave up
        after 3 minutes — {plural(attempts, 'health check')} failed. Showcase
        farms still work; your own farms need the server.
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
