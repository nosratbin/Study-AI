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

/* ---------- Phase 3: Opportunity Hub ---------- */

export type OpportunityCategory =
  | "gov_scholarship" | "private_scholarship" | "merit_scholarship" | "financial_assistance" | "stipend"
  | "national_competition" | "international_competition" | "hackathon" | "ai_olympiad"
  | "cultural" | "sports" | "research" | "internship" | "study_abroad";

export const CATEGORY_OPTIONS: { value: OpportunityCategory; label: string }[] = [
  { value: "gov_scholarship", label: "Government scholarship" },
  { value: "private_scholarship", label: "Private scholarship" },
  { value: "merit_scholarship", label: "Merit scholarship" },
  { value: "financial_assistance", label: "Financial assistance" },
  { value: "stipend", label: "Stipend" },
  { value: "national_competition", label: "National competition" },
  { value: "international_competition", label: "International competition" },
  { value: "hackathon", label: "Hackathon" },
  { value: "ai_olympiad", label: "AI Olympiad" },
  { value: "cultural", label: "Cultural competition" },
  { value: "sports", label: "Sports competition" },
  { value: "research", label: "Research opportunity" },
  { value: "internship", label: "Internship" },
  { value: "study_abroad", label: "Study abroad" },
];

export type ApplicationStatus = "planned" | "applied" | "accepted" | "rejected";
export type VerificationStatus = "unverified" | "verified" | "rejected";

export const APPLICATION_LABELS: Record<ApplicationStatus, string> = {
  planned: "Planning to apply",
  applied: "Applied",
  accepted: "Accepted",
  rejected: "Not selected",
};

export interface TrackedApplicationInfo {
  status: ApplicationStatus;
  notes: string | null;
  applied_at: string | null;
  updated_at: string;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: OpportunityCategory;
  category_label: string;
  provider: string;
  eligibility: string;
  education_levels: EducationLevel[];
  deadline: string | null;
  days_left: number | null;
  is_closed: boolean;
  required_documents: string[];
  official_url: string;
  verified_at: string | null;
  saved: boolean;
  application: TrackedApplicationInfo | null;
}

export interface OpportunityMatch {
  opportunity: Opportunity;
  score: number;
  reasons: string[];
}

export interface TrackedApplication {
  opportunity: Opportunity;
  application: TrackedApplicationInfo;
}

export interface AdminOpportunity {
  id: string;
  title: string;
  description: string;
  category: OpportunityCategory;
  category_label: string;
  provider: string;
  eligibility: string;
  education_levels: EducationLevel[];
  deadline: string | null;
  required_documents: string[];
  official_url: string;
  verification_status: VerificationStatus;
  verified_by_name: string | null;
  verified_at: string | null;
  source_note: string | null;
  saved_count: number;
  created_at: string;
  updated_at: string;
}

/* ---------- Phase 3: Google Workspace ---------- */

export type GoogleFeature = "drive" | "calendar";

export interface GoogleStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
  features: Record<GoogleFeature, boolean>;
}

export interface GoogleDoc {
  id: string;
  name: string;
  web_view_link: string | null;
}

export interface GoogleEvent {
  id: string;
  html_link: string | null;
}

/** Bangladesh time, e.g. "31 Dec 2026, 11:59 PM". */
export function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka",
  }).format(new Date(iso));
}
