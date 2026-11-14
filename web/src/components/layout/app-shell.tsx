"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  BadgeCheck,
  Bell,
  Bot,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FlaskConical,
  HeartHandshake,
  Home,
  LifeBuoy,
  LogOut,
  Map,
  Menu,
  Medal,
  Megaphone,
  ScrollText,
  GraduationCap,
  Library,
  Users,
  Settings,
  ShieldCheck,
  Trophy,
  BookOpen,
  Cloud,
  type LucideIcon,
} from "lucide-react";
import { Logo, Spinner } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/vengeance/sheet";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  available: boolean;
  /** Only shown to these roles (default: everyone). The backend enforces access either way. */
  roles?: Role[];
}

// `available` flips to true as each phase ships. Unavailable items render as disabled, never as dead links.
const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, available: true },
  { href: "/learn", label: "Learning Center", icon: BookOpen, available: true },
  { href: "/tutor", label: "AI Tutor", icon: Bot, available: true },
  { href: "/assessment", label: "Assessment", icon: ClipboardCheck, available: true },
  { href: "/roadmap", label: "Roadmap", icon: Map, available: true },
  { href: "/projects", label: "Project Lab", icon: FlaskConical, available: true, roles: ["student"] },
  { href: "/projects/review", label: "Project reviews", icon: ClipboardList, available: true, roles: ["teacher", "admin"] },
  { href: "/opportunities-hub", label: "Opportunities", icon: Trophy, available: true, roles: ["student"] },
  { href: "/google", label: "Google Workspace", icon: Cloud, available: true },
  { href: "/teacher/students", label: "Students", icon: GraduationCap, available: true, roles: ["teacher", "admin"] },
  { href: "/teacher/courses", label: "Course authoring", icon: Library, available: true, roles: ["teacher", "admin"] },
  { href: "/admin/users", label: "Users", icon: Users, available: true, roles: ["admin"] },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone, available: true, roles: ["admin"] },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, available: true, roles: ["admin"] },
  { href: "/admin/opportunities", label: "Verify opportunities", icon: ShieldCheck, available: true, roles: ["admin"] },
  { href: "/admin/achievements", label: "Verify achievements", icon: BadgeCheck, available: true, roles: ["admin"] },
  { href: "/admin/support", label: "MindCare support", icon: LifeBuoy, available: true, roles: ["admin"] },
  { href: "/career", label: "Career Navigator", icon: Briefcase, available: true, roles: ["student"] },
  { href: "/planner", label: "Study Planner", icon: CalendarDays, available: true, roles: ["student"] },
  { href: "/mindcare", label: "MindCare", icon: HeartHandshake, available: true, roles: ["student"] },
  { href: "/passport", label: "Skill Passport", icon: Medal, available: true, roles: ["student"] },
  { href: "/notifications", label: "Notifications", icon: Bell, available: true },
  { href: "/settings", label: "Settings", icon: Settings, available: true },
];

// Mobile bottom navigation: four role-specific shortcuts plus "More", which opens the full NAV in a sheet.
const BOTTOM: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, available: true },
  { href: "/learn", label: "Learn", icon: BookOpen, available: true, roles: ["student"] },
  { href: "/tutor", label: "AI Tutor", icon: Bot, available: true, roles: ["student"] },
  { href: "/opportunities-hub", label: "Opportunities", icon: Trophy, available: true, roles: ["student"] },
  { href: "/teacher/students", label: "Students", icon: GraduationCap, available: true, roles: ["teacher", "admin"] },
  { href: "/projects/review", label: "Reviews", icon: ClipboardList, available: true, roles: ["teacher", "admin"] },
  { href: "/teacher/courses", label: "Courses", icon: Library, available: true, roles: ["teacher", "admin"] },
];

const forRole = (items: NavItem[], role?: Role) => items.filter((i) => !i.roles || (!!role && i.roles.includes(role)));

/** Client-side guard. The backend enforces auth on every request; this only handles routing/UX. */
export function RequireAuth({ children, allowIncompleteOnboarding = false }: { children: ReactNode; allowIncompleteOnboarding?: boolean }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const needsOnboarding = !!user && user.role === "student" && !user.onboarding_completed;

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (needsOnboarding && !allowIncompleteOnboarding) router.replace("/onboarding");
  }, [user, loading, needsOnboarding, allowIncompleteOnboarding, router]);

  const ready = !loading && !!user && !(needsOnboarding && !allowIncompleteOnboarding);
  // Children must stay rendered (Next.js validates every segment for instant navigation, and a hidden <Activity>
  // is not server-rendered), so they are only hidden until auth resolves. Their early fetches are harmless:
  // a signed-out 401 fires SESSION_EXPIRED_EVENT and the effect above redirects to /login.
  return (
    <>
      {!ready && <Spinner />}
      <div hidden={!ready}>{children}</div>
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const nav = forRole(NAV, user?.role);
  const bottom = forRole(BOTTOM, user?.role);
  const inMore = !bottom.some((i) => isActive(pathname, i.href));

  // The sheet is mobile-only; close it if the viewport grows to desktop (tablet rotation) so no invisible overlay is left behind.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setMoreOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-card lg:flex">
        <div className="flex items-center justify-between py-4 pl-5 pr-3">
          <Link href="/dashboard" aria-label="Dashboard">
            <Logo />
          </Link>
          <NotificationBell />
        </div>
        <nav className="flex-1 overflow-y-auto px-3" aria-label="App">
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isActive(pathname, item.href)} />
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="grid size-9 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700" aria-hidden>
              {user?.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.full_name}</p>
              <p className="truncate text-xs capitalize text-muted">{user?.role}</p>
            </div>
            <ThemeToggle />
            <button onClick={onLogout} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink" aria-label="Log out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-card/90 px-4 backdrop-blur lg:hidden">
          <Link href="/dashboard" aria-label="Dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle className="size-10" />
            <button onClick={onLogout} className="grid size-10 place-items-center rounded-lg text-muted" aria-label="Log out">
              <LogOut className="size-5" />
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Bottom">
        <ul className="grid grid-cols-5">
          {bottom.map(({ href, label, icon: Icon, available }) => {
            const active = isActive(pathname, href);
            const inner = (
              <>
                <Icon className="size-5" aria-hidden />
                <span className="text-[11px] font-medium">{label}</span>
              </>
            );
            return (
              <li key={label}>
                {available ? (
                  <Link
                    href={href}
                    className={clsx("flex h-16 flex-col items-center justify-center gap-1", active ? "text-brand-600" : "text-muted")}
                    aria-current={active ? "page" : undefined}
                  >
                    {inner}
                  </Link>
                ) : (
                  <span className="flex h-16 cursor-not-allowed flex-col items-center justify-center gap-1 text-muted/50" aria-disabled title="Coming soon">
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={clsx("flex h-16 w-full flex-col items-center justify-center gap-1", inMore ? "text-brand-600" : "text-muted")}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
            >
              <Menu className="size-5" aria-hidden />
              <span className="text-[11px] font-medium">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
          <SheetHeader className="px-5 pt-5">
            <SheetTitle>All sections</SheetTitle>
            <SheetDescription className="sr-only">Every part of IccheGhuri you can open.</SheetDescription>
          </SheetHeader>
          <nav className="overflow-y-auto px-3 pb-4" aria-label="All sections">
            <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
              {nav.map((item) => (
                <li key={item.href} onClick={() => setMoreOpen(false)}>
                  <NavLink item={item} active={isActive(pathname, item.href)} />
                </li>
              ))}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const { icon: Icon, label, href, available } = item;
  const cls = "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";
  if (!available) {
    return (
      <span className={clsx(cls, "cursor-not-allowed text-muted/60")} aria-disabled title="Coming soon">
        <Icon className="size-4.5" aria-hidden /> {label}
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide">Soon</span>
      </span>
    );
  }
  return (
    <Link href={href} className={clsx(cls, active ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-surface")} aria-current={active ? "page" : undefined}>
      <Icon className="size-4.5" aria-hidden /> {label}
    </Link>
  );
}

/** Active for the section root and anything below it (e.g. /learn/python-basics highlights Learning Center). */
function isActive(pathname: string, href: string) {
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return href === "/learn" && pathname.startsWith("/lessons/");
}
