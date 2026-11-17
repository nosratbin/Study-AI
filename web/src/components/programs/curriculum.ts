import type { EducationLevel } from "@/lib/types";

/**
 * The curriculum shared by the Programs and Learning levels pages. Stage hints come from the seeded course
 * descriptions; the demo courses mirror `backend/app/seed.py` (all seeded `is_demo=True`, so the UI labels them Demo).
 */

export type StageId = "python" | "ai" | "ml" | "dl" | "projects";

export const STAGES: { id: StageId; name: string; hint: string }[] = [
  { id: "python", name: "Python", hint: "Variables, control flow, functions and lists" },
  { id: "ai", name: "AI fundamentals", hint: "Features and labels, training and testing, supervised and unsupervised" },
  { id: "ml", name: "Machine learning", hint: "scikit-learn pipelines, validation and tuning" },
  { id: "dl", name: "Deep learning", hint: "Neural networks, backpropagation and transfer learning" },
  { id: "projects", name: "Project development", hint: "Colab mini projects, then work for your portfolio" },
];

export const DEMO_COURSES: Record<EducationLevel, { title: string; hours: number }[]> = {
  school: [
    { title: "What is Artificial Intelligence?", hours: 1.5 },
    { title: "First Steps in Coding", hours: 2 },
  ],
  college: [
    { title: "Python Fundamentals", hours: 6 },
    { title: "AI Fundamentals", hours: 5 },
  ],
  university: [
    { title: "Machine Learning with scikit-learn", hours: 10 },
    { title: "Deep Learning Foundations", hours: 12 },
  ],
};

/** "1.5 h", "12 h": one format for every course length on both pages. */
export const hours = (h: number) => `${h} h`;

export type ProgramTone = "school" | "college" | "university";

/**
 * The four programs. `cells` maps a program onto the roadmap stages it teaches, using its own topics as the notes;
 * Growth & Opportunities runs alongside every stage, so it has no cells.
 */
export const PROGRAMS: {
  name: string;
  level: string;
  stage: string;
  tone: ProgramTone | null;
  items: string[];
  cells: Partial<Record<StageId, string>>;
}[] = [
  {
    name: "AI Foundations",
    level: "School",
    stage: "Beginner",
    tone: "school",
    items: ["What is AI and where we use it", "Logical thinking and first steps in coding", "Using AI responsibly and safely"],
    cells: { python: "First steps in coding", ai: "What AI is, and using it safely" },
  },
  {
    name: "Python & AI Fundamentals",
    level: "College",
    stage: "Intermediate",
    tone: "college",
    items: ["Python fundamentals", "Data, features and labels", "Supervised vs unsupervised learning", "Mini projects in Google Colab"],
    cells: { python: "Python fundamentals", ai: "Data, features and labels", projects: "Mini projects in Colab" },
  },
  {
    name: "Applied Machine Learning",
    level: "University",
    stage: "Professional",
    tone: "university",
    items: ["scikit-learn pipelines and validation", "Deep learning foundations", "Portfolio-grade AI projects", "Mentorship and research pathways"],
    cells: { ml: "scikit-learn pipelines", dl: "Deep learning foundations", projects: "Portfolio-grade projects" },
  },
  {
    name: "Growth & Opportunities",
    level: "All levels",
    stage: "Alongside every stage",
    tone: null,
    items: ["Verified scholarships, stipends and competitions", "Career Navigator and soft skills", "Skill Passport to showcase achievements", "MindCare well-being support"],
    cells: {},
  },
];
