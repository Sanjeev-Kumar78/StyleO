import { useEffect, useState } from "react";

import api from "../services/api";

type ImageState = {
  imageId?: string;
  imageUrl: string | null;
  status: "idle" | "loading" | "loaded" | "error";
};

export default function useAuthenticatedImage(
  imageId?: string,
): { imageUrl: string | null; loading: boolean } {
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
    let cancelled = false;
    let objectUrl: string | null = null;

    if (!imageId) {
      return;
    }

    api
      .get(`/wardrobe/image/${imageId}`, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setState({
          imageId,
          imageUrl: objectUrl,
          status: "loaded",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            imageId,
            imageUrl: null,
            status: "error",
          });
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageId]);

  return {
    imageUrl: resolvedState.imageUrl,
    loading: resolvedState.status === "loading",
  };
}
