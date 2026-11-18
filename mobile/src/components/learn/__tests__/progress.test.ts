import { describe, expect, it } from "@jest/globals";
import type { CourseCard, LessonSummary, ProgressStatus } from "@/lib/types";
import {
  addRecentSearch,
  buildRails,
  clampPercent,
  completionCopy,
  courseCta,
  coursePercent,
  currentLessonIndex,
  isColabUrl,
  lessonA11yLabel,
  lessonState,
  searchCourses,
  swipeDirection,
  topicSuggestions,
} from "../progress";

const lessons = (...statuses: ProgressStatus[]): LessonSummary[] =>
  statuses.map((status, i) => ({ id: `l${i + 1}`, title: `Lesson ${i + 1}`, order_index: i, duration_min: 10, status }));

function course(over: Partial<CourseCard> & { id: string }): CourseCard {
  return {
    title: over.id,
    slug: over.id,
    description: "",
    level: "school",
    estimated_hours: 1,
    lesson_count: 4,
    completed_lessons: 0,
    percent: 0,
    is_demo: true,
    ...over,
  };
}

describe("progress maths", () => {
  it("computes and clamps percentages", () => {
    expect(coursePercent([])).toBe(0);
    expect(coursePercent(lessons("completed", "in_progress", "not_started"))).toBe(33);
    expect(coursePercent(lessons("completed", "completed"))).toBe(100);
    expect(clampPercent(140)).toBe(100);
    expect(clampPercent(-3)).toBe(0);
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});

describe("next-lesson selection", () => {
  it("picks the first lesson that isn't completed", () => {
    expect(currentLessonIndex(lessons("completed", "not_started", "in_progress"))).toBe(1);
    expect(currentLessonIndex(lessons("in_progress"))).toBe(0);
    expect(currentLessonIndex(lessons("completed", "completed"))).toBe(-1);
    expect(currentLessonIndex([])).toBe(-1);
  });

  it("maps each lesson to a timeline state", () => {
    const ls = lessons("completed", "not_started", "in_progress", "not_started");
    const cur = currentLessonIndex(ls);
    expect(ls.map((l, i) => lessonState(l, i, cur))).toEqual(["done", "current", "started", "upcoming"]);
  });

  it("labels the course button Start, Continue or Review", () => {
    expect(courseCta({ lessons: [] })).toBeNull();
    expect(courseCta({ lessons: lessons("not_started", "not_started") })).toEqual({ label: "Start course", lessonId: "l1" });
    expect(courseCta({ lessons: lessons("completed", "not_started") })).toEqual({ label: "Continue · Lesson 2", lessonId: "l2" });
    expect(courseCta({ lessons: lessons("in_progress", "not_started") })).toEqual({ label: "Continue · Lesson 1", lessonId: "l1" });
    expect(courseCta({ lessons: lessons("completed", "completed") })).toEqual({ label: "Review course", lessonId: "l1" });
  });

  it("announces timeline state for screen readers", () => {
    expect(lessonA11yLabel(3, "done", "Functions", 10)).toBe("Lesson 3, completed. Functions. 10 minutes");
    expect(lessonA11yLabel(1, "current", "Intro", 1)).toBe("Lesson 1, up next. Intro. 1 minute");
  });
});

describe("rails", () => {
  const all = [
    course({ id: "a", level: "school", completed_lessons: 2, percent: 50 }),
    course({ id: "b", level: "college" }),
    course({ id: "c", level: "school", completed_lessons: 4, percent: 100 }),
    course({ id: "d", level: "school", completed_lessons: 1, percent: 25 }),
    course({ id: "e", level: "school" }),
  ];

  it("splits in-progress, recommended and everything for a level", () => {
    const rails = buildRails(all, "school", ["a", "b", "e", "c", "missing"]);
    expect(rails.inProgress.map((c) => c.id)).toEqual(["a", "d"]);
    // In-progress, finished, other-level and unknown ids are dropped from Recommended.
    expect(rails.recommended.map((c) => c.id)).toEqual(["e"]);
    expect(rails.all.map((c) => c.id)).toEqual(["a", "c", "d", "e"]);
  });

  it("shows every level for 'all'", () => {
    expect(buildRails(all, "all").all).toHaveLength(5);
    expect(buildRails(all, "all").recommended).toEqual([]);
  });
});

describe("search", () => {
  const catalogue = [
    course({ id: "py", title: "Python Fundamentals", description: "Variables and functions", level: "college" }),
    course({ id: "ml", title: "Machine Learning with scikit-learn", description: "Pipelines in Python", level: "university" }),
    course({ id: "ai", title: "What is Artificial Intelligence?", description: "A first look at AI", level: "school" }),
  ];

  it("ranks title matches above description matches", () => {
    expect(searchCourses(catalogue, "python").map((c) => c.id)).toEqual(["py", "ml"]);
  });

  it("requires every word and matches levels", () => {
    expect(searchCourses(catalogue, "python pipelines").map((c) => c.id)).toEqual(["ml"]);
    expect(searchCourses(catalogue, "beginner").map((c) => c.id)).toEqual(["ai"]);
    expect(searchCourses(catalogue, "   ")).toEqual([]);
  });

  it("only suggests topics that match a course", () => {
    expect(topicSuggestions(catalogue, ["Python", "Robotics", "Machine learning"])).toEqual(["Python", "Machine learning"]);
  });

  it("keeps recent searches unique, newest first and capped", () => {
    let list: string[] = [];
    for (const q of ["python", "ml", "Python", " deep  learning ", "a", "x1", "x2", "x3"]) list = addRecentSearch(list, q, 4);
    expect(list).toEqual(["x3", "x2", "x1", "deep learning"]);
  });
});

describe("completion copy", () => {
  const base = { lesson_id: "l1", course_id: "c", status: "completed" as const };

  it("offers the next lesson while the course is unfinished", () => {
    const copy = completionCopy({ ...base, course_percent: 50, next_lesson_id: "l3" }, 2, 4, "Python");
    expect(copy.action).toBe("next");
    expect(copy.actionLabel).toBe("Next lesson");
    expect(copy.body).toContain("50%");
    expect(copy.body).toContain("lesson 3 of 4");
  });

  it("celebrates the certificate only when the API issued one", () => {
    const withCert = completionCopy({ ...base, course_percent: 100, next_lesson_id: null, certificate_code: "IG-123" }, 4, 4, "Python");
    expect(withCert.title).toBe("Course complete!");
    expect(withCert.body).toContain("certificate");
    const noCert = completionCopy({ ...base, course_percent: 100, next_lesson_id: null }, 4, 4, "Python");
    expect(noCert.body).not.toContain("certificate");
    expect(noCert.action).toBe("course");
  });

  it("nudges to finish skipped lessons on the last lesson", () => {
    const copy = completionCopy({ ...base, course_percent: 75, next_lesson_id: null }, 4, 4, "Python");
    expect(copy.action).toBe("course");
    expect(copy.body).toContain("remaining lessons");
  });
});

describe("swipeDirection", () => {
  it("commits on distance or a flick, and snaps back otherwise", () => {
    expect(swipeDirection(-120, 0)).toBe(1);
    expect(swipeDirection(120, 0)).toBe(-1);
    expect(swipeDirection(-40, -1200)).toBe(1);
    expect(swipeDirection(40, 1200)).toBe(-1);
    expect(swipeDirection(-40, -100)).toBe(0);
    // A fast flick that barely moved doesn't count.
    expect(swipeDirection(-5, -2000)).toBe(0);
  });
});

describe("isColabUrl", () => {
  it("accepts only https Google Colab links", () => {
    expect(isColabUrl("https://colab.research.google.com/drive/abc123")).toBe(true);
    expect(isColabUrl("https://colab.research.google.com/github/org/repo/blob/main/a.ipynb")).toBe(true);
    expect(isColabUrl("http://colab.research.google.com/drive/abc")).toBe(false);
    expect(isColabUrl("https://colab.research.google.com.evil.example/drive/abc")).toBe(false);
    expect(isColabUrl("https://colab.research.google.com@evil.example/")).toBe(false);
    expect(isColabUrl("javascript:alert(1)")).toBe(false);
  });
});
