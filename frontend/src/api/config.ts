import { BACKEND_BASE_URL } from "../services/api";

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
    const base = String(BACKEND_BASE_URL).replace(/\/$/, "");
    acc[path.slice(1)] = `${base}${path}`;
    return acc;
  },
  {},
);

export default exportedRoutes;
