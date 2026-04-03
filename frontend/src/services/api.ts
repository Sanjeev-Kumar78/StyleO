import axios from "axios";

/**
 * Centralised Axios instance for all backend API calls.
 *
 * - `withCredentials` ensures the httpOnly JWT cookie is sent automatically.
 * - Uses relative paths in dev (Vite proxy forwards to FastAPI).
 * - In production, set VITE_BACKEND_URL to your API origin.
 */
const resolvedBaseUrl = import.meta.env.VITE_BACKEND_URL || "";

export const BACKEND_BASE_URL = String(resolvedBaseUrl).replace(/\/$/, "");

const api = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 7000, // Default: 15 seconds for most routes
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to override timeout for different route types
api.interceptors.request.use((config) => {
  // Auth check route needs fast timeout to avoid blocking UI
  const isAuthRoute = config.url?.includes("/auth/me");

  // Routes that depend on AI processing need longer timeouts
  const aiDependentRoutes = ["/recommendation", "/outfit", "/wardrobe/analyze"];

  const isAiRoute = aiDependentRoutes.some((route) =>
    config.url?.includes(route),
  );

  if (isAuthRoute) {
    // 5 seconds for auth check - fail fast to show navbar
    config.timeout = 5000;
  } else if (isAiRoute) {
    // 5 minutes for AI processing
    config.timeout = 300000;
  }

  return config;
});

export default api;
