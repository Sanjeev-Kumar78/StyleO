import { useContext } from "react";
import { BackendStatusContext } from "../context/backendStatusStore";

export const useBackendStatus = () => {
  const context = useContext(BackendStatusContext);
  if (!context) {
    throw new Error("useBackendStatus must be used within a BackendStatusProvider");
  }
  return context;
};
