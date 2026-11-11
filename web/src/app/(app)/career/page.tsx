"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Briefcase, Compass, Star } from "lucide-react";
import { Badge, Card, LoadError, PageHeader } from "@/components/ui";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/vengeance/empty";
import { Progress } from "@/components/vengeance/progress";
import { Skeleton } from "@/components/vengeance/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/vengeance/tabs";
import { api, ApiError } from "@/lib/api";
import type { CareerCard } from "@/lib/types";

export default function CareersPage() {
  const [careers, setCareers] = useState<CareerCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState("all");

  const fetchData = useCallback(
    () => api<CareerCard[]>("/careers").then(setCareers, (e) => setError(e instanceof ApiError ? e.message : "Could not load careers.")),
    [],
  );
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (error)
    return (
      <LoadError
        message={error}
        onRetry={() => {
          setError(null);
          fetchData();
        }}
      />
    );

  const fields = careers ? [...new Set(careers.map((c) => c.field))].sort() : [];
  const goals = careers?.filter((c) => c.is_goal) ?? [];
  const shown = careers?.filter((c) => field === "all" || c.field === field) ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Career Navigator"
        subtitle="Careers that fit your interests and what you've learned so far. The match is rule-based: interests, skills you've shown and courses you've done."
      />

      {careers === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-52 rounded-card" />
          ))}
        </div>
      ) : careers.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Compass />
              </EmptyMedia>
              <EmptyTitle>No careers published yet</EmptyTitle>
              <EmptyDescription>Check back soon. Your teachers and admins are adding career guides.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <>
          {goals.length > 0 && (
            <section aria-labelledby="goals-heading" className="rounded-card border border-brand-200 bg-brand-50/60 p-4 sm:p-5">
              <h2 id="goals-heading" className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                <Star className="size-4 fill-brand-500 text-brand-500" aria-hidden /> Your career goals
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {goals.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/career/${g.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-sm font-medium hover:border-brand-400"
                    >
                      {g.title}{" "}
                      <span className="text-xs text-muted">
                        {g.match}% match{g.is_demo ? " · Demo" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {fields.length > 1 && (
            <Tabs value={field} onValueChange={setField}>
              <TabsList className="mb-0 h-auto max-w-full flex-wrap justify-start">
                <TabsTrigger value="all">All fields</TabsTrigger>
                {fields.map((f) => (
                  <TabsTrigger key={f} value={f}>
                    {f}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <li key={c.id}>
                <CareerTile career={c} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function CareerTile({ career: c }: { career: CareerCard }) {
  return (
    <Card
      as="article"
      className="group relative flex h-full flex-col transition-shadow hover:shadow-md has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Briefcase className="size-5" aria-hidden />
        </span>
        <div className="flex gap-1">
          {c.is_goal && (
            <Badge tone="brand">
              <Star className="size-3 fill-current" aria-hidden /> Goal
            </Badge>
          )}
          {c.is_demo && <Badge>Demo</Badge>}
        </div>
      </div>
      <h3 className="mt-3 font-semibold leading-snug">
        <Link href={`/career/${c.slug}`} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none group-hover:text-brand-600">
          {c.title}
        </Link>
      </h3>
      <p className="text-xs font-medium text-muted">{c.field}</p>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted">{c.summary}</p>
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted">Match</span>
          <span className="font-semibold">{c.match}%</span>
        </div>
        <Progress value={c.match} aria-label={`${c.title} match ${c.match}%`} />
        {c.reasons[0] && <p className="pt-1 text-xs text-muted">{c.reasons[0]}</p>}
      </div>
    </Card>
  );
}
