import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBackendStatus } from "../context/BackendStatusContext";
import { FaServer, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { MdRefresh } from "react-icons/md";

export const BackendWakeSlider: React.FC = () => {
  const { status, progress, isWaking, triggerWake } = useBackendStatus();

  if (!isWaking) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 25 }}
        style={{
          width: "100%",
          marginBottom: "1.25rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "var(--bg-elevated)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--border-hi)",
            boxShadow: "0 8px 32px var(--shadow-heavy)",
            borderRadius: "1rem",
            padding: "1.1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            position: "relative",
          }}
        >
          {/* Main Info Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
              {/* Pulsing Icon depending on status */}
              {(status === "waking" || status === "health-check") && (
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  style={{
                    color: "var(--accent)",
                    fontSize: "1.25rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <FaServer />
                </motion.div>
              )}

              {status === "ready" && (
                <div style={{ color: "var(--accent)", fontSize: "1.25rem", display: "flex", alignItems: "center" }}>
                  <FaCheckCircle />
                </div>
              )}

              {status === "error" && (
                <div style={{ color: "var(--danger-text)", fontSize: "1.25rem", display: "flex", alignItems: "center" }}>
                  <FaExclamationCircle />
                </div>
              )}

              {/* Text descriptions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: "0.925rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {status === "waking" && "Waking up StyleO cloud server..."}
                  {status === "health-check" && "Verifying backend health..."}
                  {status === "ready" && "StyleO is now online!"}
                  {status === "error" && "Server connection delayed"}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 400,
                    fontSize: "0.75rem",
                    color: "var(--text-dim)",
                    opacity: 0.8,
                  }}
                >
                  {status === "waking" && "AWS EC2 is booting. This takes ~60-90s on first load."}
                  {status === "health-check" && "Server is running. Waiting for the app to be ready..."}
                  {status === "ready" && "Connected successfully. Syncing closet..."}
                  {status === "error" && "EC2 failed to start within the window. Try a retry pinger."}
                </span>
              </div>
            </div>

            {/* Percentage or Retry Button */}
            <div>
              {(status === "waking" || status === "health-check") && (
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "var(--accent)",
                    background: "var(--accent-dim)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.5rem",
                  }}
                >
                  {Math.round(progress)}%
                </span>
              )}
              {status === "ready" && (
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: "var(--accent)",
                    background: "var(--accent-dim)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.5rem",
                  }}
                >
                  Ready
                </span>
              )}
              {status === "error" && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={triggerWake}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    background: "var(--surface-2)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.35rem 0.65rem",
                    borderRadius: "0.5rem",
                    boxShadow: "0 2px 8px var(--shadow-heavy)",
                  }}
                >
                  <MdRefresh style={{ fontSize: "0.9rem" }} />
                  Retry
                </motion.button>
              )}
            </div>
          </div>

          {/* Slider/Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "5px",
              background: "var(--surface-2)",
              borderRadius: "9999px",
              overflow: "hidden",
            }}
          >
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: status === "ready" ? 0.4 : 0.2 }}
              style={{
                height: "100%",
                borderRadius: "9999px",
                background: status === "error" ? "var(--danger-text)" : "var(--accent)",
                boxShadow: status === "error" ? "none" : "0 0 8px var(--accent-glow)",
              }}
            />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BackendWakeSlider;
