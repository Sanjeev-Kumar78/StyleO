import axios from "axios";

/**
 * Centralised Axios instance for all backend API calls.
 *
 * - `withCredentials` ensures the httpOnly JWT cookie is sent automatically.
 * - Uses relative paths in dev (Vite proxy forwards to FastAPI).
 * - In production, set VITE_API_BASE_URL to your API origin.
 */
const resolvedBaseUrl = import.meta.env.VITE_BACKEND_URL || "";

export const BACKEND_BASE_URL = String(resolvedBaseUrl).replace(/\/$/, "");

const api = axios.create({
  baseURL: BACKEND_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
