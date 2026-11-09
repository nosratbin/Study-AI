import Link from "next/link";
import { Clock } from "lucide-react";
import { Badge, Card, Progress } from "@/components/ui";
import { levelLabel, type CourseCard as Course } from "@/lib/types";

export function CourseCard({ course: c, showLevel = false }: { course: Course; showLevel?: boolean }) {
  return (
    <Card as="article" className="group relative flex flex-col p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug">
          <Link href={`/learn/${c.slug}`} className="after:absolute after:inset-0 after:rounded-card focus-visible:outline-none group-hover:text-brand-600">
            {c.title}
          </Link>
        </h3>
        <div className="flex shrink-0 gap-1">
          {showLevel && <Badge tone="brand">{levelLabel(c.level)}</Badge>}
          {c.is_demo && <Badge>Demo</Badge>}
        </div>
      </div>
      <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-muted">{c.description}</p>
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {c.completed_lessons}/{c.lesson_count} lessons · {c.estimated_hours}h
          </span>
          <span className="font-medium text-ink">{c.percent}%</span>
        </div>
        <Progress value={c.percent} label={`${c.title} progress`} />
      </div>
    </Card>
  );
}
