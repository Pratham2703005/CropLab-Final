import { SERVER_STATUS } from "@/constants";

export type ServerStatus = typeof SERVER_STATUS[keyof typeof SERVER_STATUS];