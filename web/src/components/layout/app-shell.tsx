"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import clsx from "clsx";
import {
  Bell,
  Bot,
  Briefcase,
  CalendarDays,
  ClipboardCheck,
  FlaskConical,
  HeartHandshake,
  Home,
  LogOut,
  Map,
  Medal,
  Settings,
  ShieldCheck,
  Trophy,
  BookOpen,
  User as UserIcon,
  Cloud,
  type LucideIcon,
} from "lucide-react";
import { Logo, Spinner } from "@/components/ui";
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
  { href: "/projects", label: "Project Lab", icon: FlaskConical, available: false },
  { href: "/opportunities-hub", label: "Opportunities", icon: Trophy, available: true, roles: ["student"] },
  { href: "/google", label: "Google Workspace", icon: Cloud, available: true },
  { href: "/admin/opportunities", label: "Verify opportunities", icon: ShieldCheck, available: true, roles: ["admin"] },
  { href: "/career", label: "Career Navigator", icon: Briefcase, available: false },
  { href: "/planner", label: "Study Planner", icon: CalendarDays, available: false },
  { href: "/mindcare", label: "MindCare", icon: HeartHandshake, available: false },
  { href: "/passport", label: "Skill Passport", icon: Medal, available: false },
  { href: "/notifications", label: "Notifications", icon: Bell, available: false },
  { href: "/settings", label: "Settings", icon: Settings, available: true },
];

// Mobile bottom navigation per spec: Home · Learn · AI Tutor · Opportunities · Profile
const BOTTOM: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home, available: true },
  { href: "/learn", label: "Learn", icon: BookOpen, available: true },
  { href: "/tutor", label: "AI Tutor", icon: Bot, available: true },
  { href: "/opportunities-hub", label: "Opportunities", icon: Trophy, available: true, roles: ["student"] },
  { href: "/settings", label: "Profile", icon: UserIcon, available: true },
];

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

  if (loading || !user || (needsOnboarding && !allowIncompleteOnboarding)) return <Spinner />;
  return <>{children}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-white lg:flex">
        <div className="px-5 py-5">
          <Link href="/dashboard" aria-label="Dashboard">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto px-3" aria-label="App">
          <ul className="space-y-0.5">
            {NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role))).map((item) => (
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
            <button onClick={onLogout} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink" aria-label="Log out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
          <Link href="/dashboard" aria-label="Dashboard">
            <Logo />
          </Link>
          <button onClick={onLogout} className="grid size-10 place-items-center rounded-lg text-muted" aria-label="Log out">
            <LogOut className="size-5" />
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10 lg:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Bottom">
        <ul className="grid grid-cols-5">
          {BOTTOM.map(({ href, label, icon: Icon, available: ready, roles }) => {
            const available = ready && (!roles || (!!user && roles.includes(user.role)));
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
                  <Link href={href} className={clsx("flex h-16 flex-col items-center justify-center gap-1", active ? "text-brand-600" : "text-muted")}>
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
        </ul>
      </nav>
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
