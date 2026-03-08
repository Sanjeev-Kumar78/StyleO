const API_BASE_URL = ""; // Empty string forces relative paths, which Vite proxies to the backend.

const routesPaths = [
  "/user",
  "/auth",
  "/check",
  "/wardrobe",
  "/outfit",
  "/profile",
  "/style-recommendation",
] as string[];
// Callback to create an object with keys as route names and values as full URLs
const exportedRoutes: Record<string, string> = routesPaths.reduce(
  (acc: Record<string, string>, path: string) => {
    acc[path.slice(1)] = `${API_BASE_URL}${path}`;
    return acc;
  },
  {},
);

export default exportedRoutes;
