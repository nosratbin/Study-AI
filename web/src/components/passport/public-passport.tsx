"use client";

import { useParams } from "next/navigation";
import { BadgeCheck, CircleX, ExternalLink, ShieldCheck } from "lucide-react";
import { Badge, Card, LoadError, Spinner } from "@/components/ui";
import { useApi } from "@/lib/use-api";
import { LEVELS, SKILL_KINDS, formatDay, type CertificateCheck, type PublicPassport } from "@/lib/types";

const wrap = "mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6";

export function PublicPassportView() {
  const { token } = useParams<{ token: string }>();
  const pp = useApi<PublicPassport>(`/public/passport/${encodeURIComponent(token)}`);

  if (pp.error)
    return (
      <div className={wrap}>
        {pp.error.status === 404 ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold">This passport link isn&apos;t active</p>
            <p className="mt-1 text-muted">The student may have turned sharing off or created a new link.</p>
          </Card>
        ) : (
          <LoadError message={pp.error.message} onRetry={pp.reload} />
        )}
      </div>
    );
  if (!pp.data) return <Spinner />;
  const p = pp.data;
  const level = LEVELS.find((l) => l.value === p.education_level)?.label;

  return (
    <div className={wrap}>
      <header className="space-y-2">
        <p className="text-sm font-medium text-brand-600">LEARN AI Skill Passport</p>
        <h1 className="text-3xl font-bold tracking-tight">{p.display_name}</h1>
        <p className="text-muted">{[level, p.institution].filter(Boolean).join(" · ")}</p>
        {p.skills.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Skills">
            {p.skills.map((s) => (
              <li key={s}>
                <Badge tone="brand">{s}</Badge>
              </li>
            ))}
          </ul>
        )}
      </header>

      {p.courses.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Courses completed</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {p.courses.map((c) => (
              <li key={c.course_id}>
                <Card className="h-full p-5">
                  {c.is_demo && <Badge>Demo course</Badge>}
                  <p className="mt-1 font-semibold">{c.title}</p>
                  {c.certificate_code && (
                    <a className="mt-1 inline-flex items-center gap-1 text-sm text-brand-600 hover:underline" href={`/certificates/${c.certificate_code}`}>
                      <ShieldCheck className="size-3.5" aria-hidden /> Verify certificate {c.certificate_code}
                    </a>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.projects.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Projects</h2>
          <ul className="space-y-3">
            {p.projects.map((pr) => (
              <li key={pr.id}>
                <Card className="p-5">
                  {pr.reviewed && (
                    <Badge tone="success">
                      <BadgeCheck className="size-3.5" aria-hidden /> Reviewed by a teacher
                    </Badge>
                  )}
                  <p className="mt-2 font-semibold">{pr.title}</p>
                  {pr.description && <p className="text-sm text-muted">{pr.description}</p>}
                  <p className="mt-2 flex flex-wrap gap-4 text-sm">
                    {pr.colab_url && (
                      <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={pr.colab_url} target="_blank" rel="noopener noreferrer">
                        Colab <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    )}
                    {pr.repo_url && (
                      <a className="inline-flex items-center gap-1 text-brand-600 hover:underline" href={pr.repo_url} target="_blank" rel="noopener noreferrer">
                        Repository <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    )}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.records.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Achievements</h2>
          <ul className="space-y-2">
            {p.records.map((r) => (
              <li key={r.id} className="rounded-xl border border-line bg-white px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge>{SKILL_KINDS.find((k) => k.value === r.kind)?.label.replace(/ \(.*\)$/, "")}</Badge>
                  {r.verification_status === "verified" ? (
                    <Badge tone="success">
                      <BadgeCheck className="size-3.5" aria-hidden /> Verified by LEARN AI
                    </Badge>
                  ) : (
                    <Badge>Self-reported</Badge>
                  )}
                </div>
                <p className="mt-1 font-medium">{r.title}</p>
                <p className="text-sm text-muted">{[r.issued_by, r.achieved_on && formatDay(r.achieved_on)].filter(Boolean).join(" · ")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!p.courses.length && !p.projects.length && !p.records.length && (
        <Card className="p-8 text-center text-muted">Nothing has been shared on this passport yet.</Card>
      )}

      <p className="text-xs text-muted">
        &quot;Verified&quot; means a LEARN AI admin checked the evidence. &quot;Self-reported&quot; items were added by the student and have not been
        checked.
      </p>
    </div>
  );
}

export function CertificateCheckView() {
  const { code } = useParams<{ code: string }>();
  const c = useApi<CertificateCheck>(`/public/certificates/${encodeURIComponent(code)}`);

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      {c.error ? (
        <LoadError message={c.error.message} onRetry={c.reload} />
      ) : !c.data ? (
        <Spinner />
      ) : c.data.valid ? (
        <Card className="space-y-3 p-8 text-center">
          <BadgeCheck className="mx-auto size-10 text-success" aria-hidden />
          <p className="text-lg font-semibold">Valid LEARN AI certificate</p>
          {c.data.is_demo && (
            <p className="text-sm">
              <Badge>Demo course</Badge> This course is sample content from the LEARN AI demo, not an accredited course.
            </p>
          )}
          <p className="text-2xl font-bold">{c.data.holder}</p>
          <p>{c.data.title}</p>
          <p className="text-sm text-muted">
            Code <span className="font-mono">{c.data.code}</span>
            {c.data.issued_at ? ` · issued ${formatDay(c.data.issued_at)}` : ""}
          </p>
        </Card>
      ) : (
        <Card className="space-y-3 p-8 text-center">
          <CircleX className="mx-auto size-10 text-danger" aria-hidden />
          <p className="text-lg font-semibold">No certificate found</p>
          <p className="text-muted">
            Check the code <span className="font-mono">{c.data.code}</span> and try again.
          </p>
        </Card>
      )}
    </div>
  );
}
