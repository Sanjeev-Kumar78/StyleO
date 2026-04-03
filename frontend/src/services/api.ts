import axios from "axios";

const ACCESS_TOKEN_STORAGE_KEY = "styleo_access_token";
let inMemoryAccessToken: string | null = null;

const isJwtLike = (token: string): boolean => {
  // Basic structural validation to avoid persisting malformed token values.
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token);
};

export const getAccessToken = (): string | null => {
  if (inMemoryAccessToken) {
    return inMemoryAccessToken;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    if (storedToken) {
      if (!isJwtLike(storedToken)) {
        window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        return null;
      }
      inMemoryAccessToken = storedToken;
    }
    return storedToken;
  } catch {
    return null;
  }
};

export const setAccessToken = (token: string): void => {
  if (!isJwtLike(token)) {
    return;
  }

  inMemoryAccessToken = token;

  if (typeof window === "undefined") {
    return;
  }

  try {
    // sessionStorage limits token lifetime to the browser tab/session.
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage failures (private mode, blocked storage, etc.)
  }
};

export const clearAccessToken = (): void => {
  inMemoryAccessToken = null;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

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
  const token = getAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAccessToken();
    }
    return Promise.reject(error);
  },
);

export default api;
