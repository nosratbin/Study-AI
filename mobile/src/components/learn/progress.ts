/**
 * Pure learning logic shared by the Learn tab, course detail and lesson reader: progress maths, which lesson is next,
 * rails, search and the copy for the lesson-complete moment. No React Native imports, so it is unit-tested directly.
 */
import type { CourseCard, CourseDetail, EducationLevel, LessonSummary, ProgressResult } from "@/lib/types";

/** POST /learning/progress also returns `certificate_code` once every lesson in the course is complete. */
export type ProgressOut = ProgressResult & { certificate_code?: string | null };

export type LevelFilter = EducationLevel | "all";
export type LessonState = "done" | "current" | "started" | "upcoming";

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Percent of lessons completed, 0–100. An empty course is 0%. */
export function coursePercent(lessons: Pick<LessonSummary, "status">[]): number {
  if (!lessons.length) return 0;
  return clampPercent((lessons.filter((l) => l.status === "completed").length / lessons.length) * 100);
}

/** The lesson to open next: the first one that isn't completed, or -1 when every lesson is done (or there are none). */
export function currentLessonIndex(lessons: Pick<LessonSummary, "status">[]): number {
  return lessons.findIndex((l) => l.status !== "completed");
}

export function lessonState(lesson: Pick<LessonSummary, "status">, index: number, current: number): LessonState {
  if (lesson.status === "completed") return "done";
  if (index === current) return "current";
  if (lesson.status === "in_progress") return "started";
  return "upcoming";
}

const STATE_WORDS: Record<LessonState, string> = { done: "completed", current: "up next", started: "in progress", upcoming: "not started" };

/** Screen-reader label for a timeline row, e.g. "Lesson 3, completed. Functions. 10 minutes". */
export function lessonA11yLabel(number: number, state: LessonState, title: string, minutes: number): string {
  return `Lesson ${number}, ${STATE_WORDS[state]}. ${title}. ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export interface CourseCta {
  label: string;
  lessonId: string;
}

/** The sticky bottom button on course detail: Start, Continue (with the lesson number) or Review. Null for an empty course. */
export function courseCta(course: Pick<CourseDetail, "lessons">): CourseCta | null {
  const { lessons } = course;
  if (!lessons.length) return null;
  const current = currentLessonIndex(lessons);
  if (current === -1) return { label: "Review course", lessonId: lessons[0].id };
  const started = lessons.some((l) => l.status !== "not_started");
  if (!started) return { label: "Start course", lessonId: lessons[0].id };
  return { label: `Continue · Lesson ${current + 1}`, lessonId: lessons[current].id };
}

export const isInProgress = (c: Pick<CourseCard, "completed_lessons" | "lesson_count">) => c.completed_lessons > 0 && c.completed_lessons < c.lesson_count;

export interface CourseRails {
  inProgress: CourseCard[];
  recommended: CourseCard[];
  all: CourseCard[];
}

/**
 * Split the catalogue into the Learn tab's rails for one level filter. `recommendedIds` come from the dashboard; they are
 * mapped back onto the fresh catalogue (so progress is current) and in-progress courses aren't repeated there.
 */
export function buildRails(courses: CourseCard[], level: LevelFilter, recommendedIds: string[] = []): CourseRails {
  const shown = level === "all" ? courses : courses.filter((c) => c.level === level);
  const inProgress = shown.filter(isInProgress).sort((a, b) => b.percent - a.percent);
  const byId = new Map(shown.map((c) => [c.id, c]));
  const recommended = recommendedIds
    .map((id) => byId.get(id))
    .filter((c): c is CourseCard => !!c && !isInProgress(c) && c.percent < 100);
  return { inProgress, recommended, all: shown };
}

const LEVEL_WORDS: Record<EducationLevel, string> = { school: "school beginner", college: "college intermediate hsc", university: "university professional" };

function haystack(c: CourseCard): string {
  return `${c.title} ${c.description} ${LEVEL_WORDS[c.level]}`.toLowerCase();
}

/** Client-side course search: every word must match the title, description or level; title matches rank first. */
export function searchCourses(courses: CourseCard[], query: string): CourseCard[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = courses
    .map((c, i) => {
      const hay = haystack(c);
      if (!words.every((w) => hay.includes(w))) return null;
      const title = c.title.toLowerCase();
      const score = words.filter((w) => title.includes(w)).length * 10 + (title.startsWith(words[0]) ? 5 : 0);
      return { c, score, i };
    })
    .filter((x): x is { c: CourseCard; score: number; i: number } => x !== null);
  return scored.sort((a, b) => b.score - a.score || a.i - b.i).map((x) => x.c);
}

/** Topics offered as search suggestions; only those that actually match a published course are shown. */
export const TOPIC_CANDIDATES = ["Python", "Machine learning", "Deep learning", "Coding", "AI basics", "Data", "Neural networks", "Ethics", "Robotics"];

export function topicSuggestions(courses: CourseCard[], candidates = TOPIC_CANDIDATES, max = 6): string[] {
  return candidates.filter((t) => searchCourses(courses, t).length > 0).slice(0, max);
}

/** Most-recent-first list of searches, de-duplicated case-insensitively, capped at `max`. */
export function addRecentSearch(list: string[], query: string, max = 5): string[] {
  const q = query.trim().replace(/\s+/g, " ");
  if (q.length < 2) return list;
  return [q, ...list.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, max);
}

export interface CompletionCopy {
  title: string;
  body: string;
  action: "next" | "course";
  actionLabel: string;
}

const CHEERS = ["Lesson done. Nice work!", "Another one done!", "You're on a roll!", "Great focus!"];

/** Copy for the lesson-complete moment. The certificate line only appears when the API says one was issued. */
export function completionCopy(result: ProgressOut, lessonNumber: number, lessonCount: number, courseTitle: string): CompletionCopy {
  if (result.certificate_code) {
    return {
      title: "Course complete!",
      body: `You finished every lesson in ${courseTitle}. Your certificate is ready in your Skill Passport.`,
      action: "course",
      actionLabel: "Back to course",
    };
  }
  const pct = clampPercent(result.course_percent);
  if (pct >= 100) return { title: "Course complete!", body: `You finished every lesson in ${courseTitle}.`, action: "course", actionLabel: "Back to course" };
  const title = CHEERS[(Math.max(1, lessonNumber) - 1) % CHEERS.length];
  if (result.next_lesson_id) {
    return { title, body: `${pct}% of the course done. Up next: lesson ${Math.min(lessonNumber + 1, lessonCount)} of ${lessonCount}.`, action: "next", actionLabel: "Next lesson" };
  }
  return { title, body: `${pct}% of the course done. Finish the remaining lessons to complete it.`, action: "course", actionLabel: "Back to course" };
}

/**
 * Which way a horizontal swipe on the lesson reader commits: 1 = next lesson, -1 = previous, 0 = snap back.
 * A flick (velocity) or a long enough drag (distance) both count. Runs on the UI thread, hence the directive.
 */
export function swipeDirection(translationX: number, velocityX: number, distance = 96, velocity = 700): -1 | 0 | 1 {
  "worklet";
  if (translationX <= -distance || (velocityX <= -velocity && translationX < -16)) return 1;
  if (translationX >= distance || (velocityX >= velocity && translationX > 16)) return -1;
  return 0;
}

/** Lesson Colab links must point at Google Colab over https (the server enforces this too; this is defence in depth). */
export function isColabUrl(url: string): boolean {
  return /^https:\/\/colab\.research\.google\.com\/[^\s]*$/i.test(url.trim());
}
