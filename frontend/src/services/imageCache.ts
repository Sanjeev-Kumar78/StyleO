import api from "./api";
import imageQueue from "./imageQueue";

type CacheEntry = {
  url: string;
  refCount: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string>>();

async function _fetchBlobUrl(imageId: string, attempt = 0): Promise<string> {
  const MAX_ATTEMPTS = 3;
  const BACKOFF_BASE_MS = 150;

  try {
    const resp = await api.get(`/wardrobe/image/${imageId}`, {
      responseType: "blob",
      timeout: 20000,
    });
    const objectUrl = URL.createObjectURL(resp.data as Blob);
    return objectUrl;
  } catch (err) {
    if (attempt + 1 >= MAX_ATTEMPTS) throw err;
    const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt);
    await new Promise((r) => setTimeout(r, backoff));
    return _fetchBlobUrl(imageId, attempt + 1);
  }
}

export function acquireImageUrl(imageId?: string): Promise<string | null> {
  if (!imageId) return Promise.resolve(null);

  // Return cached value if present
  const existing = cache.get(imageId);
  if (existing) {
    existing.refCount += 1;
    return Promise.resolve(existing.url);
  }

  // If there's an inflight fetch, piggy-back on it
  const inflightPromise = inflight.get(imageId);
  if (inflightPromise) return inflightPromise;

  const promise = imageQueue.enqueue(async () => {
    try {
      const url = await _fetchBlobUrl(imageId);
      cache.set(imageId, { url, refCount: 1 });
      return url;
    } finally {
      inflight.delete(imageId);
    }
  });

  inflight.set(imageId, promise);
  return promise;
}

export function releaseImageUrl(imageId?: string): void {
  if (!imageId) return;
  const entry = cache.get(imageId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // Ignore revoke errors for already-collected object URLs.
    }
    cache.delete(imageId);
  }
}

export function clearImageCache() {
  for (const [, entry] of cache.entries()) {
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // Ignore revoke errors for already-collected object URLs.
    }
  }
  cache.clear();
  inflight.clear();
}

export default {
  acquireImageUrl,
  releaseImageUrl,
  clearImageCache,
};
