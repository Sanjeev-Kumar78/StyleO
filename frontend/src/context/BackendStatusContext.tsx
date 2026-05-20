import React, { createContext, useContext, useEffect, useState, useRef } from "react";

export type BackendStatus = "idle" | "waking" | "ready" | "error";

interface BackendStatusContextType {
  status: BackendStatus;
  progress: number;
  isWaking: boolean;
  triggerWake: () => void;
}

const BackendStatusContext = createContext<BackendStatusContextType | undefined>(undefined);

const WAKE_URL = "https://9qk1chspm2.execute-api.us-east-2.amazonaws.com/prod/wake";
const MAX_RETRY_MS = 5 * 60 * 1000;
const SIMULATED_BOOT_DURATION_MS = 75 * 1000; // 75 seconds estimated cold start

export const BackendStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<BackendStatus>("idle");
  const [progress, setProgress] = useState(0);

  const pollTimeoutRef = useRef<any | null>(null);
  const progressIntervalRef = useRef<any | null>(null);
  const startedRef = useRef<number>(0);
  const isCancelledRef = useRef<boolean>(false);

  const cleanTimers = () => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const startProgressSimulation = () => {
    if (progressIntervalRef.current) return;

    // Reset progress and start smooth increment
    setProgress(0);
    const tickMs = 150;
    // Over 75 seconds, we increment to 95% max
    const totalTicks = SIMULATED_BOOT_DURATION_MS / tickMs;
    const incrementPerTick = 95 / totalTicks;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
          return 95;
        }
        return Math.min(95, prev + incrementPerTick);
      });
    }, tickMs);
  };

  const completeProgress = () => {
    // Stop simulated progress and rapidly zip to 100%
    cleanTimers();
    setStatus("ready");
    setProgress(100);

    // Stay at 100% / ready for a brief moment for visual satisfaction, then clear
    pollTimeoutRef.current = setTimeout(() => {
      if (!isCancelledRef.current) {
        setStatus("idle");
        setProgress(0);
      }
    }, 2000);
  };

  const ping = async (): Promise<void> => {
    if (isCancelledRef.current) return;

    try {
      const res = await fetch(WAKE_URL, { method: "GET" });

      if (isCancelledRef.current) return;

      if (res.status === 200) {
        // If we were already waking, transition to complete
        if (status === "waking" || progress > 0) {
          completeProgress();
        } else {
          // Silent success if already running on first load
          setStatus("idle");
          setProgress(0);
        }
        return;
      }

      if (res.status === 202) {
        // EC2 is starting up. Transition status to waking and start simulation.
        setStatus("waking");
        startProgressSimulation();

        // Respect Retry-After header or default to 15s
        const retryAfter = parseInt(res.headers.get("Retry-After") ?? "15", 10);
        const elapsed = Date.now() - startedRef.current;

        if (elapsed + retryAfter * 1000 < MAX_RETRY_MS) {
          pollTimeoutRef.current = setTimeout(ping, retryAfter * 1000);
        } else {
          // Reached timeout budget
          cleanTimers();
          setStatus("error");
        }
      } else {
        // Other HTTP status errors
        cleanTimers();
        setStatus("error");
      }
    } catch (err) {
      // Network failure
      if (!isCancelledRef.current) {
        cleanTimers();
        setStatus("error");
      }
    }
  };

  const triggerWake = () => {
    cleanTimers();
    isCancelledRef.current = false;
    startedRef.current = Date.now();
    setProgress(0);
    setStatus("idle");
    ping();
  };

  useEffect(() => {
    isCancelledRef.current = false;
    triggerWake();

    return () => {
      isCancelledRef.current = true;
      cleanTimers();
    };
  }, []);

  const isWaking = status === "waking" || status === "ready" || status === "error";

  return (
    <BackendStatusContext.Provider value={{ status, progress, isWaking, triggerWake }}>
      {children}
    </BackendStatusContext.Provider>
  );
};

export const useBackendStatus = () => {
  const context = useContext(BackendStatusContext);
  if (!context) {
    throw new Error("useBackendStatus must be used within a BackendStatusProvider");
  }
  return context;
};
