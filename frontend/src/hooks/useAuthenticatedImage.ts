import { useEffect, useState } from "react";

import imageCache from "../services/imageCache";

type ImageState = {
  imageId?: string;
  imageUrl: string | null;
  status: "idle" | "loading" | "loaded" | "error";
};

export default function useAuthenticatedImage(imageId?: string): {
  imageUrl: string | null;
  loading: boolean;
} {
  const [state, setState] = useState<ImageState>({
    imageId: undefined,
    imageUrl: null,
    status: "idle",
  });

  const resolvedState: ImageState =
    state.imageId === imageId
      ? state
      : {
          imageId,
          imageUrl: null,
          status: imageId ? "loading" : "idle",
        };

  useEffect(() => {
    let objectUrl: string | null = null;

    if (!imageId) {
      return;
    }

    // Use shared cache + dedupe + retries to avoid duplicate fetches
    let mounted = true;
    imageCache
      .acquireImageUrl(imageId)
      .then((url) => {
        if (!mounted) return;
        if (url) {
          objectUrl = url;
          setState({ imageId, imageUrl: objectUrl, status: "loaded" });
        } else {
          setState({ imageId, imageUrl: null, status: "error" });
        }
      })
      .catch(() => {
        if (!mounted) return;
        setState({ imageId, imageUrl: null, status: "error" });
      });

    return () => {
      mounted = false;
      if (objectUrl) {
        // Decrement refcount and let shared cache manage revoke
        imageCache.releaseImageUrl(imageId);
      }
    };
  }, [imageId]);

  return {
    imageUrl: resolvedState.imageUrl,
    loading: resolvedState.status === "loading",
  };
}
