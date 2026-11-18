/**
 * Notifications data: one list query and one unread-count query under the "notifications" key, kept in sync.
 * The list response carries the unread count, so loading the list also refreshes the bell's badge. Mark-read and
 * mark-all-read update both caches optimistically and roll back on failure.
 */
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, toApiError, type ApiError } from "@/lib/api";
import type { AppNotification, NotificationList } from "@/lib/types";

export const NOTIFICATIONS_KEY = ["notifications"] as const;
export const LIST_KEY = ["notifications", "list"] as const;
export const UNREAD_KEY = ["notifications", "unread"] as const;
const MARK_KEY = ["notifications", "mark"] as const;

type Unread = { unread: number };
type Snapshot = { list?: NotificationList; unread?: Unread };

export function useUnreadCount(enabled = true) {
  return useQuery<Unread, ApiError>({
    queryKey: UNREAD_KEY,
    queryFn: ({ signal }) => api<Unread>("/notifications/unread-count", { signal }),
    enabled,
  });
}

export function useNotificationList() {
  const qc = useQueryClient();
  return useQuery<NotificationList, ApiError>({
    queryKey: LIST_KEY,
    queryFn: async ({ signal }) => {
      const r = await api<NotificationList>("/notifications?limit=100", { signal });
      qc.setQueryData<Unread>(UNREAD_KEY, { unread: r.unread });
      return r;
    },
  });
}

async function snapshot(qc: QueryClient): Promise<Snapshot> {
  await qc.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
  return { list: qc.getQueryData<NotificationList>(LIST_KEY), unread: qc.getQueryData<Unread>(UNREAD_KEY) };
}

function restore(qc: QueryClient, s: Snapshot | undefined) {
  if (!s) return;
  qc.setQueryData(LIST_KEY, s.list);
  qc.setQueryData(UNREAD_KEY, s.unread);
}

/** Refetch only when this is the last mark mutation in flight, so a refetch can't overwrite a newer optimistic change. */
function settle(qc: QueryClient) {
  if (qc.isMutating({ mutationKey: MARK_KEY }) === 1) qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, AppNotification, Snapshot>({
    mutationKey: MARK_KEY,
    mutationFn: (n) => api(`/notifications/${n.id}/read`, { method: "POST" }).catch((e) => Promise.reject(toApiError(e))),
    onMutate: async (n) => {
      const s = await snapshot(qc);
      const wasUnread = s.list ? s.list.items.some((x) => x.id === n.id && !x.read_at) : !n.read_at;
      if (!wasUnread) return s;
      const now = new Date().toISOString();
      if (s.list) {
        qc.setQueryData<NotificationList>(LIST_KEY, {
          items: s.list.items.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)),
          unread: Math.max(0, s.list.unread - 1),
        });
      }
      if (s.unread) qc.setQueryData<Unread>(UNREAD_KEY, { unread: Math.max(0, s.unread.unread - 1) });
      return s;
    },
    onError: (_e, _n, s) => restore(qc, s),
    onSettled: () => settle(qc),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<Unread, ApiError, void, Snapshot>({
    mutationKey: MARK_KEY,
    mutationFn: () => api<Unread>("/notifications/read-all", { method: "POST" }).catch((e) => Promise.reject(toApiError(e))),
    onMutate: async () => {
      const s = await snapshot(qc);
      const now = new Date().toISOString();
      if (s.list) qc.setQueryData<NotificationList>(LIST_KEY, { items: s.list.items.map((x) => (x.read_at ? x : { ...x, read_at: now })), unread: 0 });
      qc.setQueryData<Unread>(UNREAD_KEY, { unread: 0 });
      return s;
    },
    onError: (_e, _v, s) => restore(qc, s),
    onSettled: () => settle(qc),
  });
}
