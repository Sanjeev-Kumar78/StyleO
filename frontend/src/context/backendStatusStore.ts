import { createContext } from "react";

export type BackendStatus =
  | "idle"
  | "waking"
  | "health-check"
  | "ready"
  | "error";

export interface BackendStatusContextType {
  status: BackendStatus;
  progress: number;
  isWaking: boolean;
  triggerWake: () => void;
}

export const BackendStatusContext =
  createContext<BackendStatusContextType | undefined>(undefined);
