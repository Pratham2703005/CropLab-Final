import type { ServerBannerContent, ServerStatus } from '@/types/server';

export const SERVER_STATUS = {
    CHECKING: 'checking',
    WAKING: 'waking',
    READY: 'ready',
    DEGRADED: 'degraded',
    ERROR: 'error',
    STOPPED: 'stopped',
} as const;

/** Tones used by the server-status banner. Distinct from the NDVI chip palette. */
export const SERVER_TONE = {
  AMBER: 'amber',
  ORANGE: 'orange',
  RED: 'red',
  SLATE: 'slate',
} as const;

export const TONE_CLASSES = {
  [SERVER_TONE.AMBER]: 'border-amber-200 bg-amber-50 text-amber-800',
  [SERVER_TONE.ORANGE]: 'border-orange-200 bg-orange-50 text-orange-800',
  [SERVER_TONE.RED]: 'border-red-200 bg-red-50 text-red-800',
  [SERVER_TONE.SLATE]: 'border-slate-200 bg-slate-50 text-slate-700',
};

export const BUTTON_CLASSES = {
  [SERVER_TONE.AMBER]: 'border-amber-300 text-amber-800 hover:bg-amber-100',
  [SERVER_TONE.ORANGE]: 'border-orange-300 text-orange-800 hover:bg-orange-100',
  [SERVER_TONE.RED]: 'border-red-300 text-red-700 hover:bg-red-100',
  [SERVER_TONE.SLATE]: 'border-slate-300 text-slate-700 hover:bg-slate-100',
};

/**
 * Per-status banner content. READY is omitted because the banner renders
 * nothing once the server is ready.
 */
export const SERVER_STATUS_BANNER: Record<
  Exclude<ServerStatus, typeof SERVER_STATUS.READY>,
  ServerBannerContent
> = {
  [SERVER_STATUS.CHECKING]: {
    tone: SERVER_TONE.AMBER,
    showSpinner: true,
    message: 'Connecting to Server.',
  },
  [SERVER_STATUS.WAKING]: {
    tone: SERVER_TONE.AMBER,
    showSpinner: true,
    message:
      'Server is waking up, this can take up to 2 minutes. Try Showcase farms in the meantime.',
  },
  [SERVER_STATUS.DEGRADED]: {
    tone: SERVER_TONE.ORANGE,
    showSpinner: false,
    lead: 'Server is degraded.',
    message:
      'Google Earth Engine Failed to start. This can happen if the server is overloaded. Try again later or contact support if the issue persists.',
  },
  [SERVER_STATUS.STOPPED]: {
    tone: SERVER_TONE.SLATE,
    showSpinner: false,
    message: 'Server Connection stopped.',
  },
  [SERVER_STATUS.ERROR]: {
    tone: SERVER_TONE.RED,
    showSpinner: false,
    message:
      'Unable to connect to the server. Please check your internet connection and try again. If the problem persists, contact support.',
  },
};