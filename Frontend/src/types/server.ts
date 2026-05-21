import { SERVER_STATUS, SERVER_TONE } from "@/constants";

export type ServerStatus = typeof SERVER_STATUS[keyof typeof SERVER_STATUS];

export type ServerTone = typeof SERVER_TONE[keyof typeof SERVER_TONE];

export interface ServerBannerContent {
  tone: ServerTone;
  showSpinner: boolean;
  /** Optional bold lead-in rendered before the message. */
  lead?: string;
  message: string;
}

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
