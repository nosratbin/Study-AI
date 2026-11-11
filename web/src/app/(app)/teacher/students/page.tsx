"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, UsersRound } from "lucide-react";
import { Alert, Badge, Button, Card, Input, LoadError, PageHeader, Select } from "@/components/ui";
import { isNotVerified, NotVerifiedNotice } from "@/components/staff/not-verified";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/vengeance/empty";
import { Skeleton } from "@/components/vengeance/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/vengeance/table";
import { api, ApiError } from "@/lib/api";
import { LEVELS, levelLabel, timeAgo, type EducationLevel, type StudentRow } from "@/lib/types";

const PAGE = 50;

export default function StudentsPage() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<EducationLevel | "">("");
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notVerified, setNotVerified] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Bumped on every new search so a late "load more" response for the old filter is dropped.
  const generation = useRef(0);

  const fetchPage = useCallback(
    (offset: number) => {
      const params = new URLSearchParams({
        limit: String(PAGE),
        offset: String(offset),
      });
      if (query) params.set("q", query);
      if (level) params.set("level", level);
      return api<StudentRow[]>(`/teacher/students?${params}`);
    },
    [query, level],
  );

  useEffect(() => {
    let live = true;
    generation.current += 1;
    fetchPage(0).then(
      (r) => {
        if (!live) return;
        setRows(r);
        setMore(r.length === PAGE);
      },
      (e) => {
        if (!live) return;
        if (isNotVerified(e)) setNotVerified(true);
        else setError(e instanceof ApiError ? e.message : "Could not load students.");
      },
    );
    return () => {
      live = false;
    };
  }, [fetchPage, attempt]);

  async function loadMore() {
    if (!rows) return;
    const gen = generation.current;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const r = await fetchPage(rows.length);
      if (gen !== generation.current) return;
      setRows((prev) => {
        const seen = new Set((prev ?? []).map((s) => s.id));
        return [...(prev ?? []), ...r.filter((s) => !seen.has(s.id))];
      });
      setMore(r.length === PAGE);
    } catch (e) {
      if (gen === generation.current) setMoreError(e instanceof ApiError ? e.message : "Could not load more students.");
    } finally {
      setLoadingMore(false);
    }
  }

  function reset() {
    setRows(null);
    setMoreError(null);
    // Re-fetch even when the query is unchanged (pressing Search twice), or the skeleton never clears.
    setAttempt((n) => n + 1);
  }

  function search(e: React.FormEvent) {
    e.preventDefault();
    reset();
    setQuery(q.trim());
  }

  if (notVerified) return <NotVerifiedNotice title="Students" />;

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
      <PageHeader title="Students" subtitle="Learning progress for students on IccheGhuri. Contact details and wellbeing data are never shown here." />

      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="student-q" className="sr-only">
          Search by name or institution
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="student-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or institution" maxLength={100} className="pl-9" />
        </div>
        <label htmlFor="student-level" className="sr-only">
          Level
        </label>
        <Select
          id="student-level"
          value={level}
          onChange={(e) => {
            reset();
            setLevel(e.target.value as EducationLevel | "");
          }}
          className="sm:w-44"
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows === null ? (
        <Skeleton className="h-96 rounded-card" />
      ) : rows.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRound />
              </EmptyMedia>
              <EmptyTitle>No students found</EmptyTitle>
              <EmptyDescription>
                {query || level ? "Try a different search or level." : "Students appear here once they sign up and finish onboarding."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5 sm:pl-6">Student</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Lessons</TableHead>
                  <TableHead className="text-right">Courses done</TableHead>
                  <TableHead className="text-right">Avg score</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="pr-5 sm:pr-6">Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-64 pl-5 sm:pl-6">
                      <Link href={`/teacher/students/${s.id}`} className="block truncate font-medium hover:text-brand-600">
                        {s.full_name}
                      </Link>
                      <span className="flex items-center gap-1 truncate text-xs text-muted">
                        {s.institution ?? "—"}
                        {s.is_minor && <Badge className="px-1.5 py-0 text-[10px]">Under 18</Badge>}
                      </span>
                    </TableCell>
                    <TableCell>{s.education_level ? levelLabel(s.education_level) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.lessons_completed}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.courses_completed}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.avg_assessment === null ? "—" : `${s.avg_assessment}%`}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.projects_submitted}</TableCell>
                    <TableCell className="pr-5 text-sm text-muted sm:pr-6">{s.last_active ? timeAgo(s.last_active) : "Never"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {more && (
            <div className="space-y-2 border-t border-line p-3 text-center">
              {moreError && <Alert>{moreError}</Alert>}
              <Button variant="ghost" size="sm" onClick={loadMore} loading={loadingMore}>
                {moreError ? "Try again" : "Load more"}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
