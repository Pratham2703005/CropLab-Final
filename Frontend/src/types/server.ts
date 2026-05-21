import { SERVER_STATUS } from "@/constants";

export type ServerStatus = typeof SERVER_STATUS[keyof typeof SERVER_STATUS];

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
