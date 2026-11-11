"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollText } from "lucide-react";
import { Alert, Button, Card, LoadError, PageHeader, Select } from "@/components/ui";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/vengeance/empty";
import { Skeleton } from "@/components/vengeance/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/vengeance/table";
import { api, ApiError } from "@/lib/api";
import { type AuditEntry } from "@/lib/types";

const PAGE = 100;
const FILTERS = [
  { value: "", label: "All actions" },
  { value: "user.", label: "Users" },
  { value: "course.", label: "Courses" },
  { value: "lesson.", label: "Lessons" },
  { value: "announcement.", label: "Announcements" },
  { value: "opportunity.", label: "Opportunities" },
  { value: "skill_record.", label: "Achievements" },
  { value: "project.", label: "Projects" },
  { value: "support_", label: "MindCare support" },
];

const when = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dhaka",
});

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const generation = useRef(0);

  const url = (offset: number) => `/admin/audit?limit=${PAGE}&offset=${offset}${action ? `&action=${encodeURIComponent(action)}` : ""}`;

  useEffect(() => {
    let live = true;
    generation.current += 1;
    api<AuditEntry[]>(`/admin/audit?limit=${PAGE}&offset=0${action ? `&action=${encodeURIComponent(action)}` : ""}`).then(
      (r) => {
        if (!live) return;
        setRows(r);
        setMore(r.length === PAGE);
      },
      (e) => live && setError(e instanceof ApiError ? e.message : "Could not load the audit log."),
    );
    return () => {
      live = false;
    };
  }, [action, attempt]);

  async function loadMore() {
    if (!rows) return;
    const gen = generation.current;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const r = await api<AuditEntry[]>(url(rows.length));
      if (gen !== generation.current) return; // the filter changed while this page was loading
      // Offset paging on a newest-first log can repeat a row when new entries arrive in between.
      setRows((prev) => {
        const seen = new Set((prev ?? []).map((a) => a.id));
        return [...(prev ?? []), ...r.filter((a) => !seen.has(a.id))];
      });
      setMore(r.length === PAGE);
    } catch (e) {
      if (gen === generation.current) setMoreError(e instanceof ApiError ? e.message : "Could not load more entries.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (error)
    return (
      <LoadError
        message={error}
        onRetry={() => {
          setError(null);
          setRows(null);
          setAttempt((n) => n + 1);
        }}
      />
    );

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Audit log" subtitle="Every admin and teacher change, newest first. Times are Bangladesh time.">
        <div>
          <label htmlFor="audit-filter" className="sr-only">
            Filter by action
          </label>
          <Select
            id="audit-filter"
            value={action}
            onChange={(e) => {
              setRows(null);
              setMoreError(null);
              setOpen(null);
              setAction(e.target.value);
            }}
            className="sm:w-48"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
      </PageHeader>

      {rows === null ? (
        <Skeleton className="h-96 rounded-card" />
      ) : rows.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ScrollText />
              </EmptyMedia>
              <EmptyTitle>No entries</EmptyTitle>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5 sm:pl-6">When</TableHead>
                  <TableHead>Who</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="pr-5 sm:pr-6">IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap pl-5 text-sm text-muted sm:pl-6">
                      <time dateTime={a.created_at}>{when.format(new Date(a.created_at))}</time>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{a.actor_name ?? "System"}</TableCell>
                    <TableCell>
                      <code className="rounded bg-surface px-1.5 py-0.5 text-xs">{a.action}</code>
                    </TableCell>
                    <TableCell className="max-w-md text-xs text-muted">
                      {Object.keys(a.details).length ? (
                        <button
                          type="button"
                          onClick={() => setOpen(open === a.id ? null : a.id)}
                          aria-expanded={open === a.id}
                          className={`block break-all text-left hover:text-ink ${open === a.id ? "" : "line-clamp-2"}`}
                        >
                          {describe(a.details)}
                        </button>
                      ) : (
                        a.target_type
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-xs text-muted sm:pr-6">{a.ip ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {more && (
            <div className="space-y-2 border-t border-line p-3 text-center">
              {moreError && <Alert>{moreError}</Alert>}
              <Button size="sm" variant="ghost" onClick={loadMore} loading={loadingMore}>
                {moreError ? "Try again" : "Load more"}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function describe(details: Record<string, unknown>) {
  return Object.entries(details)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Array.isArray(v) ? v.join(" → ") : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}
