"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

/** GET `path` on mount (and when it changes). `path = null` skips the request. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    let live = true;
    api<T>(path).then(
      (d) => {
        if (!live) return;
        setData(d);
        setError(null);
      },
      (e) => {
        if (!live) return;
        setError(e instanceof ApiError ? e : new ApiError(0, "unknown", "Something went wrong. Please try again."));
      },
    );
    return () => {
      live = false;
    };
  }, [path, nonce]);

  const reload = useCallback(() => {
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  return { data, error, reload, setData };
}
