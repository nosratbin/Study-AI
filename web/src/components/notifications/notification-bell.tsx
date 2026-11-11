"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Award, Bell, BellRing, Briefcase, CalendarClock, FlaskConical, Info, Megaphone, Medal, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/vengeance/dropdown-menu";
import { Skeleton } from "@/components/vengeance/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo, type AppNotification, type NotificationKind, type NotificationList } from "@/lib/types";

export const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  info: Info,
  project: FlaskConical,
  achievement: Medal,
  certificate: Award,
  deadline: CalendarClock,
  announcement: Megaphone,
  career: Briefcase,
};

/** Fired after the notifications page changes read state, so the bell's badge stays in sync. */
export const NOTIFICATIONS_CHANGED = "iccheghuri:notifications-changed";

const POLL_MS = 60_000;

/** Only follow in-app paths, never an external or protocol-relative URL. */
export function safeLink(link: string | null): string | null {
  return link && link.startsWith("/") && !link.startsWith("//") && !link.includes("\\") ? link : null;
}

function announce() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED, { detail: "bell" }));
}

export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  // The shell renders one bell in the desktop sidebar and one in the mobile header; only the visible one polls.
  const refreshCount = useCallback(() => {
    if (document.visibilityState !== "visible" || !ref.current?.offsetParent) return;
    api<{ unread: number }>("/notifications/unread-count").then((r) => setUnread(r.unread), () => {});
  }, []);

  useEffect(() => {
    refreshCount();
    const t = window.setInterval(refreshCount, POLL_MS);
    window.addEventListener("focus", refreshCount);
    const onChange = (e: Event) => (e as CustomEvent<string>).detail !== "bell" && refreshCount();
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    // The shell swaps the sidebar bell for the header bell at the lg breakpoint; refresh when that happens.
    const lg = window.matchMedia("(min-width: 1024px)");
    lg.addEventListener("change", refreshCount);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("focus", refreshCount);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
      lg.removeEventListener("change", refreshCount);
    };
  }, [refreshCount]);

  const openSeq = useRef(0);
  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setItems(null);
    const seq = ++openSeq.current; // ignore a response from an earlier open
    api<NotificationList>("/notifications?limit=8").then(
      (r) => {
        if (seq !== openSeq.current) return;
        setItems(r.items);
        setUnread(r.unread);
      },
      () => seq === openSeq.current && setItems([]),
    );
  }

  function openItem(n: AppNotification) {
    if (!n.read_at) {
      setUnread((u) => Math.max(0, u - 1));
      api(`/notifications/${n.id}/read`, { method: "POST" }).then(announce, () => {});
    }
    const link = safeLink(n.link);
    if (link) router.push(link);
  }

  function markAll() {
    setUnread(0);
    setItems((xs) => xs?.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) ?? xs);
    api("/notifications/read-all", { method: "POST" }).then(announce, () => {});
  }

  const Icon = unread ? BellRing : Bell;
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        ref={ref}
        className={cn("relative grid size-10 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink", className)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Icon className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-4.5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-4.5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs font-medium text-brand-600 hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-96 overflow-y-auto p-1">
          {items === null ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">You&apos;re all caught up.</p>
          ) : (
            items.map((n) => {
              const KindIcon = KIND_ICON[n.kind] ?? Info;
              return (
                <DropdownMenuItem key={n.id} onSelect={() => openItem(n)} className="items-start gap-3 px-2.5 py-2.5">
                  <KindIcon className={cn("mt-0.5 size-4", n.read_at ? "text-muted" : "text-brand-500")} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm leading-snug", !n.read_at && "font-semibold")}>{n.title}</span>
                    {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{n.body}</span>}
                    <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read_at && (
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem asChild className="justify-center py-2.5 text-sm font-medium text-brand-600">
          <Link href="/notifications">See all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
