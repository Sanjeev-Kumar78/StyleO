import axios from "axios";

/**
 * Centralised Axios instance for all backend API calls.
 *
 * - `withCredentials` ensures the httpOnly JWT cookie is sent automatically.
 * - Uses relative paths in dev (Vite proxy forwards to FastAPI).
 * - In production, set VITE_API_BASE_URL to your API origin.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
