"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal, Search, ShieldCheck, UsersRound } from "lucide-react";
import { Alert, Badge, Button, Card, Input, LoadError, PageHeader, Select } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/vengeance/dropdown-menu";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/vengeance/empty";
import { Skeleton } from "@/components/vengeance/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/vengeance/table";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { levelLabel, timeAgo, type AdminUser, type Role, type UserPage } from "@/lib/types";

const PAGE = 50;
const ROLES: Role[] = ["student", "teacher", "admin"];

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState<UserPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState<{
    user: AdminUser;
    body: Change;
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams({
      limit: String(PAGE),
      offset: String(offset),
    });
    if (query) params.set("q", query);
    if (role) params.set("role", role);
    if (active) params.set("active", active);
    return api<UserPage>(`/admin/users?${params}`);
  }, [query, role, active, offset]);

  useEffect(() => {
    let live = true;
    load().then(
      (r) => live && setPage(r),
      (e) => live && setError(e instanceof ApiError ? e.message : "Could not load users."),
    );
    return () => {
      live = false;
    };
  }, [load, attempt]);

  function filter<T>(set: (v: T) => void) {
    return (v: T) => {
      setPage(null);
      setOffset(0);
      setActionError(null);
      setPending(null);
      set(v);
      // Re-run the fetch even when the value is unchanged (e.g. pressing Search twice), or the skeleton never clears.
      setAttempt((n) => n + 1);
    };
  }

  function goTo(next: number) {
    setPage(null);
    setActionError(null);
    setPending(null);
    setOffset(Math.max(0, next));
  }

  /** Returns true when an inline confirm step opened instead of applying the change. */
  function request(u: AdminUser, body: Change): boolean {
    // Changes that are hard to undo (granting or removing admin, deactivating) go through an inline confirm step.
    const risky = body.role === "admin" || (u.role === "admin" && !!body.role) || body.is_active === false;
    if (!risky) {
      update(u, body);
      return false;
    }
    setActionError(null);
    setPending({
      user: u,
      body,
      text:
        body.is_active === false
          ? `Deactivate ${u.full_name}? They are signed out and can't sign in until reactivated.`
          : body.role === "admin"
            ? `Make ${u.full_name} an admin? Admins can change any account, verify content and read the audit log.`
            : `Remove admin rights from ${u.full_name} and make them a ${body.role}?`,
    });
    return true;
  }

  async function update(u: AdminUser, body: Change) {
    setActionError(null);
    setBusy(true);
    try {
      const next = await api<AdminUser>(`/admin/users/${u.id}`, {
        method: "PATCH",
        body,
      });
      setPage((p) => (p ? { ...p, items: p.items.map((x) => (x.id === u.id ? next : x)) } : p));
      setPending(null);
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not update the user.");
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return (
      <LoadError
        message={error}
        onRetry={() => {
          setError(null);
          setAttempt((n) => n + 1);
        }}
      />
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Users"
        subtitle="Change roles, verify teachers and deactivate accounts. Every change is recorded in the audit log and signs the user out."
      />

      <form
        role="search"
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          filter(setQuery)(q.trim());
        }}
      >
        <label htmlFor="user-q" className="sr-only">
          Search by name or email
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="user-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" maxLength={100} className="pl-9" />
        </div>
        <label htmlFor="user-role" className="sr-only">
          Role
        </label>
        <Select id="user-role" value={role} onChange={(e) => filter(setRole)(e.target.value as Role | "")} className="sm:w-36">
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r[0].toUpperCase() + r.slice(1)}s
            </option>
          ))}
        </Select>
        <label htmlFor="user-active" className="sr-only">
          Status
        </label>
        <Select id="user-active" value={active} onChange={(e) => filter(setActive)(e.target.value as "" | "true" | "false")} className="sm:w-36">
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Deactivated</option>
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {actionError && <Alert>{actionError}</Alert>}

      {pending && (
        <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="text-sm">{pending.text}</p>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant={pending.body.is_active === false ? "danger" : "primary"}
              onClick={() => update(pending.user, pending.body)}
              loading={busy}
              autoFocus
            >
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(null)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {page === null ? (
        <Skeleton className="h-96 rounded-card" />
      ) : page.items.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRound />
              </EmptyMedia>
              <EmptyTitle>No users found</EmptyTitle>
              <EmptyDescription>Try a different search or filter.</EmptyDescription>
            </EmptyHeader>
            {offset > 0 && (
              <Button size="sm" variant="secondary" onClick={() => goTo(0)}>
                Back to the first page
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5 sm:pl-6">User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead className="pr-5 text-right sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {page.items.map((u) => (
                  <TableRow key={u.id} className={u.is_active ? undefined : "opacity-60"}>
                    <TableCell className="max-w-64 pl-5 sm:pl-6">
                      <span className="block truncate font-medium">{u.full_name}</span>
                      <span className="block truncate text-xs text-muted">{u.email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-1">
                        <Badge tone={u.role === "admin" ? "brand" : "neutral"} className="capitalize">
                          {u.role}
                        </Badge>
                        {u.role === "teacher" &&
                          (u.teacher_verified ? (
                            <Badge tone="success">
                              <ShieldCheck className="size-3" aria-hidden /> Verified
                            </Badge>
                          ) : (
                            <Badge>Unverified</Badge>
                          ))}
                        {!u.is_active && <Badge>Deactivated</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted">
                      {u.role === "student" ? (u.education_level ? levelLabel(u.education_level) : "Onboarding not done") : (u.institution ?? "—")}
                      {u.is_minor && " · under 18"}
                    </TableCell>
                    <TableCell className="text-sm text-muted">{timeAgo(u.created_at)}</TableCell>
                    <TableCell className="text-sm text-muted">{u.last_login_at ? timeAgo(u.last_login_at) : "Never"}</TableCell>
                    <TableCell className="pr-5 text-right sm:pr-6">
                      {u.id === me?.id ? <span className="text-xs text-muted">You</span> : <UserActions user={u} onUpdate={(body) => request(u, body)} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-muted sm:px-6">
            <span>
              {offset + 1}–{offset + page.items.length} of {page.total}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => goTo(offset - PAGE)}>
                Previous
              </Button>
              <Button size="sm" variant="ghost" disabled={offset + PAGE >= page.total} onClick={() => goTo(offset + PAGE)}>
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

type Change = Partial<{
  role: Role;
  is_active: boolean;
  teacher_verified: boolean;
}>;

function UserActions({ user: u, onUpdate }: { user: AdminUser; onUpdate: (body: Change) => boolean }) {
  // When a confirm bar opened, its Confirm button has focus; don't let the menu pull focus back to its trigger.
  const confirming = useRef(false);
  const pick = (body: Change) => {
    confirming.current = onUpdate(body);
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
        aria-label={`Actions for ${u.full_name}`}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onCloseAutoFocus={(e) => {
          if (confirming.current) e.preventDefault();
          confirming.current = false;
        }}
      >
        {u.role === "teacher" && (
          <>
            <DropdownMenuItem onSelect={() => pick({ teacher_verified: !u.teacher_verified })}>
              {u.teacher_verified ? "Remove teacher verification" : "Verify as teacher"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs font-normal text-muted">Change role</DropdownMenuLabel>
        {ROLES.filter((r) => r !== u.role).map((r) => (
          <DropdownMenuItem key={r} onSelect={() => pick({ role: r })}>
            Make {r}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {u.is_active ? (
          <DropdownMenuItem variant="destructive" onSelect={() => pick({ is_active: false })}>
            Deactivate account
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => pick({ is_active: true })}>Reactivate account</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
