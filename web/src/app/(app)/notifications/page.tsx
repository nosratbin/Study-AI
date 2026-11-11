"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BellOff, CheckCheck, Info, Trash2 } from "lucide-react";
import { Button, Card, LoadError, PageHeader } from "@/components/ui";
import { KIND_ICON, NOTIFICATIONS_CHANGED, safeLink } from "@/components/notifications/notification-bell";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/vengeance/empty";
import { Skeleton } from "@/components/vengeance/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/vengeance/tabs";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDay, timeAgo, type AppNotification, type NotificationList } from "@/lib/types";

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState<NotificationList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let live = true; // a slower response for the previous tab must not overwrite this one
    api<NotificationList>(`/notifications?limit=100${filter === "unread" ? "&unread_only=true" : ""}`).then(
      (r) => {
        if (!live) return;
        setError(null);
        setData(r);
      },
      (e) => live && setError(e instanceof ApiError ? e.message : "Could not load notifications."),
    );
    return () => {
      live = false;
    };
  }, [filter, attempt]);

  // Mark-read in the bell's dropdown refreshes this page too.
  useEffect(() => {
    const onChange = (e: Event) => (e as CustomEvent<string>).detail !== "page" && reload();
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
  }, [reload]);

  function changed(next: NotificationList) {
    setData(next);
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED, { detail: "page" }));
  }

  function markRead(n: AppNotification) {
    if (!data || n.read_at) return;
    const items = filter === "unread"
      ? data.items.filter((x) => x.id !== n.id)
      : data.items.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
    changed({ items, unread: Math.max(0, data.unread - 1) });
    api(`/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
  }

  function remove(n: AppNotification) {
    if (!data) return;
    changed({ items: data.items.filter((x) => x.id !== n.id), unread: data.unread - (n.read_at ? 0 : 1) });
    api(`/notifications/${n.id}`, { method: "DELETE" }).catch(reload);
  }

  async function markAll() {
    if (!data) return;
    const now = new Date().toISOString();
    changed({ items: filter === "unread" ? [] : data.items.map((x) => ({ ...x, read_at: x.read_at ?? now })), unread: 0 });
    await api("/notifications/read-all", { method: "POST" }).catch(reload);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Notifications" subtitle="Project reviews, certificates, deadlines of saved opportunities and announcements.">
        {!!data?.unread && (
          <Button variant="secondary" size="sm" onClick={markAll}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </PageHeader>

      <Tabs value={filter} onValueChange={(v) => { setData(null); setError(null); setFilter(v as Filter); }}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread{data?.unread ? ` (${data.unread})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>

      {error ? (
        <LoadError message={error} onRetry={() => { setError(null); setData(null); reload(); }} />
      ) : !data ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-card" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BellOff />
              </EmptyMedia>
              <EmptyTitle>{filter === "unread" ? "No unread notifications" : "No notifications yet"}</EmptyTitle>
              <EmptyDescription>You&apos;ll hear here when a teacher reviews your project, you earn a certificate or a saved deadline is close.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {data.items.map((n) => {
              const Icon = KIND_ICON[n.kind] ?? Info;
              const link = safeLink(n.link);
              const body = (
                <>
                  <span className={cn("block", !n.read_at && "font-semibold")}>{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-sm text-muted">{n.body}</span>}
                  <time dateTime={n.created_at} title={formatDay(n.created_at)} className="mt-1 block text-xs text-muted">
                    {timeAgo(n.created_at)}
                  </time>
                </>
              );
              return (
                <li key={n.id} className={cn("flex items-start gap-3 px-4 py-4 sm:px-5", !n.read_at && "bg-brand-50/40")}>
                  <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-full", n.read_at ? "bg-surface text-muted" : "bg-brand-100 text-brand-600")}>
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  {link ? (
                    <Link href={link} onClick={() => markRead(n)} className="min-w-0 flex-1 hover:text-brand-700">
                      {body}
                    </Link>
                  ) : (
                    <button onClick={() => markRead(n)} className="min-w-0 flex-1 text-left">
                      {body}
                    </button>
                  )}
                  <button onClick={() => remove(n)} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface hover:text-danger" aria-label={`Delete notification: ${n.title}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
