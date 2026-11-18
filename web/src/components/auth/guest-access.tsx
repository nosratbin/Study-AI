"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Presentation, ShieldCheck, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

const ROLES: { role: Role; label: string; hint: string; icon: LucideIcon }[] = [
  { role: "student", label: "Student", hint: "Fresh account, try everything", icon: GraduationCap },
  { role: "teacher", label: "Teacher", hint: "Read-only, sample class", icon: Presentation },
  { role: "admin", label: "Admin", hint: "Read-only, sample data", icon: ShieldCheck },
];

/** One-click guest visits for judges and visitors. The backend keeps guests apart from real users. */
export function GuestAccess() {
  const { loginAsGuest } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState("");

  async function enter(role: Role) {
    setError("");
    setBusy(role);
    try {
      router.replace(homeFor(await loginAsGuest(role)));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start a guest visit. Please try again.");
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="guest-heading" className="mt-6 border-t border-line pt-5">
      <h2 id="guest-heading" className="text-sm font-semibold">Just looking around?</h2>
      <p className="mt-0.5 text-xs text-muted">Explore as a guest, no sign-up needed.</p>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {ROLES.map(({ role, label, hint, icon: Icon }) => (
          <li key={role}>
            <button
              type="button"
              onClick={() => enter(role)}
              disabled={busy !== null}
              aria-busy={busy === role}
              className="flex h-full w-full flex-col items-center gap-1 rounded-xl border border-line bg-card px-2 py-3 text-center transition-[border-color,background-color,transform] duration-150 ease-out hover:border-brand-200 hover:bg-surface active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-wait disabled:opacity-60"
            >
              <Icon className="size-4.5 text-muted" aria-hidden />
              <span className="text-sm font-medium">{busy === role ? "Opening…" : label}</span>
              <span className="text-[11px] leading-tight text-muted">{hint}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </section>
  );
}

/** Shown at the top of every app page during a guest visit. In the page flow, not sticky, so it never covers content. */
export function GuestNotice() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user?.is_guest) return null;
  const readOnly = user.role !== "student";

  async function signUp() {
    await logout();
    router.push("/register");
  }

  return (
    <div role="status" className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
      <p className="min-w-0 flex-1 text-muted">
        <span className="font-medium text-ink">Guest {user.role}.</span>{" "}
        {readOnly
          ? "You can look around but not change anything. The students you see are samples."
          : "This account and its data are deleted within a day."}
      </p>
      <button type="button" onClick={signUp} className="font-semibold text-brand-600 hover:underline">
        Create a free account
      </button>
    </div>
  );
}
