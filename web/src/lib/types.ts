export type Role = "student" | "teacher" | "admin";
export type EducationLevel = "school" | "college" | "university";
export type Language = "en" | "bn";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

export interface StudentProfile {
  education_level: EducationLevel | null;
  institution: string | null;
  class_or_year: string | null;
  district: string | null;
  birth_year: number | null;
  is_minor: boolean;
  guardian_consent_given: boolean;
  preferred_language: Language;
  interests: string[];
  goals: string | null;
  onboarding_completed: boolean;
  recommended_level: EducationLevel | null;
}

export interface CourseCard {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: EducationLevel;
  estimated_hours: number;
  lesson_count: number;
  completed_lessons: number;
  percent: number;
  is_demo: boolean;
}

export interface Dashboard {
  greeting_name: string;
  education_level: EducationLevel | null;
  preferred_language: Language;
  stats: {
    lessons_completed: number;
    courses_in_progress: number;
    courses_completed: number;
    assessments_taken: number;
    latest_score_percent: number | null;
    saved_opportunities: number;
    unread_notifications: number;
  };
  continue_learning: {
    course_id: string;
    course_title: string;
    lesson_id: string;
    lesson_title: string;
    duration_min: number;
  } | null;
  recommended_courses: CourseCard[];
  upcoming_deadlines: { opportunity_id: string; title: string; deadline: string; official_url: string }[];
  modules: { key: string; title: string; available: boolean; phase: number }[];
}

export const LEVELS: { value: EducationLevel; label: string; tag: string; blurb: string }[] = [
  { value: "school", label: "School", tag: "Beginner", blurb: "Classes 6–10. Discover what AI is, think logically and take first steps in coding." },
  { value: "college", label: "College", tag: "Intermediate", blurb: "HSC level. Python, data and AI fundamentals with hands-on mini projects." },
  { value: "university", label: "University", tag: "Professional", blurb: "Machine learning, deep learning and portfolio-grade AI projects." },
];

/* ---------- Phase 2: learning, assessments, AI tutor ---------- */

export type ProgressStatus = "not_started" | "in_progress" | "completed";

export interface LessonSummary {
  id: string;
  title: string;
  order_index: number;
  duration_min: number;
  status: ProgressStatus;
}

export interface CourseDetail extends CourseCard {
  category: string;
  lessons: LessonSummary[];
}

export interface Lesson {
  id: string;
  title: string;
  content_md: string;
  order_index: number;
  duration_min: number;
  colab_url: string | null;
  status: ProgressStatus;
  course_id: string;
  course_slug: string;
  course_title: string;
  course_level: EducationLevel;
  is_demo: boolean;
  lesson_number: number;
  lesson_count: number;
  prev_lesson_id: string | null;
  next_lesson_id: string | null;
}

export interface ProgressResult {
  lesson_id: string;
  course_id: string;
  status: ProgressStatus;
  course_percent: number;
  next_lesson_id: string | null;
}

export interface NextLesson {
  course_id: string;
  course_title: string;
  lesson_id: string;
  lesson_title: string;
  duration_min: number;
}

export type StageStatus = "completed" | "current" | "upcoming" | "locked";

export interface RoadmapStage {
  key: string;
  title: string;
  description: string;
  status: StageStatus;
  percent: number;
  skipped_by_assessment: boolean;
  courses: CourseCard[];
  next_lesson: NextLesson | null;
  available_in_phase: number | null;
}

export interface Roadmap {
  education_level: EducationLevel | null;
  overall_percent: number;
  current_stage: string | null;
  stages: RoadmapStage[];
}

export interface AssessmentCard {
  id: string;
  title: string;
  topic: string;
  level: EducationLevel | null;
  is_placement: boolean;
  is_demo: boolean;
  question_count: number;
  time_limit_min: number | null;
  attempts: number;
  best_percent: number | null;
  last_result_id: string | null;
  in_progress_attempt_id: string | null;
}

export interface Question {
  id: string;
  prompt: string;
  options: string[];
  topic_tag: string;
}

export interface Attempt {
  attempt_id: string;
  assessment_id: string;
  title: string;
  topic: string;
  is_placement: boolean;
  is_demo: boolean;
  started_at: string;
  expires_at: string | null;
  questions: Question[];
}

export interface TopicScore {
  topic: string;
  correct: number;
  total: number;
  percent: number;
}

export interface ReviewItem {
  question_id: string;
  prompt: string;
  options: string[];
  your_answer: number | null;
  is_correct: boolean;
  explanation: string | null;
}

export interface AssessmentResult {
  result_id: string;
  assessment_id: string;
  title: string;
  is_placement: boolean;
  score: number;
  max_score: number;
  percent: number;
  completed_at: string;
  topics: TopicScore[];
  strengths: string[];
  weaknesses: string[];
  recommended_level: EducationLevel | null;
  current_level: EducationLevel | null;
  suggested_courses: CourseCard[];
  review: ReviewItem[];
}

export type ChatLanguage = "auto" | "en" | "bn";

export interface Source {
  title: string;
  course_slug: string | null;
  lesson_id: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  language: Language;
  updated_at: string;
}

export interface ChatResponse {
  conversation: Conversation;
  user_message: ChatMessage;
  assistant_message: ChatMessage;
}

export interface AIStatus {
  configured: boolean;
  daily_limit: number;
  used_today: number;
}

export interface PracticeQuestion {
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string;
}

export interface Quiz {
  topic: string;
  questions: PracticeQuestion[];
  notice: string;
}

export function levelLabel(level: EducationLevel | null | undefined) {
  return LEVELS.find((l) => l.value === level)?.label ?? "Any level";
}
