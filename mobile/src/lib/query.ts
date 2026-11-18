/**
 * TanStack Query setup. Screens fetch with `useApiQuery(["key"], "/path")` and mutate with `useMutation` + `api()`.
 * Query keys start with the resource name ("dashboard", "courses", "notifications", ...) so mutations can invalidate them.
 */
import { AppState, Platform, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { focusManager, onlineManager, QueryClient, useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { api, ApiError } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Don't retry auth or validation failures; retry network/5xx twice.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

// Refetch stale queries when the app returns to the foreground.
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== "web") focusManager.setFocused(status === "active");
}
AppState.addEventListener("change", onAppStateChange);

// Pause queries while offline and refetch failed/stale ones as soon as the connection is back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((s) => {
    setOnline(s.isConnected !== false && s.isInternetReachable !== false);
  }),
);

/** GET `path` with the shared client. Pass `path = null` to skip. */
export function useApiQuery<T>(
  key: QueryKey,
  path: string | null,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn" | "enabled">,
) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: ({ signal }) => api<T>(path!, { signal }),
    enabled: path !== null,
    ...options,
  });
}
