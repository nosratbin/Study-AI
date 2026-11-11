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
  /** True when the Doc saved earlier for this lesson was returned instead of a new one. */
  existing: boolean;
}

export interface GoogleEvent {
  id: string;
  html_link: string | null;
  /** False when an existing event was updated (same deadline or a retried reminder). */
  created: boolean;
}

/** Bangladesh time, e.g. "31 Dec 2026, 11:59 PM". */
export function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka",
  }).format(new Date(iso));
}

/* ---------- Phase 4: Project Lab, Skill Passport, MindCare, Study Planner ---------- */

export type ProjectStatus = "draft" | "submitted" | "reviewed";

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  level: EducationLevel;
  summary: string;
  skills: string[];
  estimated_hours: number;
  starter_url: string | null;
  is_demo: boolean;
}

export interface ChallengeDetail extends Challenge {
  brief_md: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  level: EducationLevel | null;
  challenge: Challenge | null;
  repo_url: string | null;
  colab_url: string | null;
  documentation: string | null;
  status: ProjectStatus;
  is_public: boolean;
  feedback: string | null;
  score: number | null;
  reviewer_name: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
  owner_name: string | null;
}

export interface AIFeedback {
  strengths: string[];
  improvements: string[];
  next_steps: string[];
  disclaimer: string;
}

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: "brand" | "success" | "neutral" }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Waiting for review", tone: "brand" },
  reviewed: { label: "Reviewed", tone: "success" },
};

export type SkillKind =
  | "course" | "skill" | "certificate" | "project" | "award" | "scholarship"
  | "competition" | "sport" | "cultural" | "leadership" | "volunteering";

export const SKILL_KINDS: { value: SkillKind; label: string }[] = [
  { value: "award", label: "Award" },
  { value: "competition", label: "Competition" },
  { value: "certificate", label: "Certificate (outside IccheGhuri)" },
  { value: "scholarship", label: "Scholarship" },
  { value: "skill", label: "Skill" },
  { value: "project", label: "Project (outside IccheGhuri)" },
  { value: "volunteering", label: "Volunteering" },
  { value: "leadership", label: "Leadership" },
  { value: "sport", label: "Sport" },
  { value: "cultural", label: "Cultural activity" },
  { value: "course", label: "Course (outside IccheGhuri)" },
];

export interface SkillRecord {
  id: string;
  kind: SkillKind;
  title: string;
  description: string | null;
  evidence_url: string | null;
  issued_by: string | null;
  achieved_on: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  is_public: boolean;
}

export interface AdminSkillRecord extends SkillRecord {
  owner_name: string;
  review_note: string | null;
}

export interface CompletedCourse {
  course_id: string;
  title: string;
  level: EducationLevel;
  category: string | null;
  completed_lessons: number;
  total_lessons: number;
  certificate_code: string | null;
  issued_at: string | null;
  /** Seeded demo course: its certificate is labelled "Demo". */
  is_demo: boolean;
}

export interface PassportProject {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  repo_url: string | null;
  colab_url: string | null;
  reviewed: boolean;
  is_public: boolean;
}

export interface ShareState {
  enabled: boolean;
  token: string | null;
  shared_at: string | null;
}

export interface Passport {
  full_name: string;
  education_level: EducationLevel | null;
  institution: string | null;
  is_minor: boolean;
  courses: CompletedCourse[];
  in_progress_courses: CompletedCourse[];
  assessments: { title: string; score: number; max_score: number; recommended_level: EducationLevel | null; completed_at: string | null }[];
  projects: PassportProject[];
  records: SkillRecord[];
  skills: string[];
  share: ShareState;
}

export interface PublicPassport {
  display_name: string;
  education_level: EducationLevel | null;
  institution: string | null;
  courses: CompletedCourse[];
  projects: PassportProject[];
  records: SkillRecord[];
  skills: string[];
}

export interface CertificateCheck {
  valid: boolean;
  code: string;
  title: string | null;
  holder: string | null;
  issued_at: string | null;
  is_demo: boolean;
}

export const MOOD_TAGS = ["exams", "homework", "family", "friends", "sleep", "health", "future", "money", "sports", "achievement"] as const;
export type MoodTag = (typeof MOOD_TAGS)[number];

export interface Checkin {
  id: string;
  mood: number;
  note: string | null;
  tags: string[];
  created_at: string;
  show_support?: boolean;
}

export type SupportResourceKind = "helpline" | "counsellor" | "organisation";

export interface SupportResource {
  id: string;
  name: string;
  kind: SupportResourceKind;
  description: string;
  phone: string | null;
  url: string | null;
  hours: string | null;
  languages: string[];
  cost_note: string | null;
}

export interface AdminSupportResource extends SupportResource {
  verification_status: VerificationStatus;
  verified_by_name: string | null;
  verified_at: string | null;
  source_note: string | null;
}

export interface SupportDirectory {
  emergency: { number: string; label: string };
  resources: SupportResource[];
}

export type SupportTopic = "stress" | "study_pressure" | "relationships" | "feeling_low" | "other";
export type SupportRequestStatus = "open" | "in_progress" | "closed";

export const SUPPORT_TOPICS: { value: SupportTopic; label: string }[] = [
  { value: "stress", label: "Stress" },
  { value: "study_pressure", label: "Study pressure" },
  { value: "relationships", label: "Family or friends" },
  { value: "feeling_low", label: "Feeling low" },
  { value: "other", label: "Something else" },
];

export interface SupportRequest {
  id: string;
  topic: SupportTopic;
  message: string | null;
  preferred_contact: "email" | "phone";
  status: SupportRequestStatus;
  created_at: string;
  handled_at: string | null;
}

export interface AdminSupportRequest extends SupportRequest {
  student_name: string;
  student_email: string;
  phone: string | null;
  is_minor: boolean;
}

export type TaskStatus = "todo" | "done";

export interface StudyTask {
  id: string;
  title: string;
  due_on: string;
  planned_minutes: number;
  status: TaskStatus;
  done_at: string | null;
  lesson_id: string | null;
  lesson_title: string | null;
  notes: string | null;
}

export interface TaskSuggestion {
  lesson_id: string;
  title: string;
  course_title: string;
  duration_min: number;
}

export interface PlannerSummary {
  week_start: string;
  planned_minutes: number;
  done_minutes: number;
  tasks_done: number;
  tasks_total: number;
  streak_days: number;
}

/** "12 Mar 2026" for a date or datetime, in Bangladesh time. */
export function formatDay(iso: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00+06:00`) : new Date(iso);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(d);
}

// ---------- Phase 5: notifications ----------

export type NotificationKind = "info" | "project" | "achievement" | "certificate" | "deadline" | "announcement" | "career";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

export type AnnouncementAudience = "all" | "students" | "teachers";

// ---------- Phase 5: teacher + admin dashboards ----------

export interface DayCount {
  day: string;
  count: number;
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface TeacherDashboard {
  stats: { students: number; active_7d: number; lessons_completed_7d: number; review_queue: number; my_reviews: number; verified: boolean };
  activity: DayCount[];
  courses: {
    id: string;
    title: string;
    slug: string;
    level: EducationLevel;
    is_published: boolean;
    is_demo: boolean;
    lesson_count: number;
    learners: number;
    completions: number;
    avg_percent: number;
  }[];
  assessments: { id: string; title: string; attempts: number; avg_percent: number }[];
  weak_topics: { topic: string; label: string; avg_percent: number; questions: number }[];
}

export interface StudentRow {
  id: string;
  full_name: string;
  education_level: EducationLevel | null;
  institution: string | null;
  is_minor: boolean;
  lessons_completed: number;
  courses_completed: number;
  avg_assessment: number | null;
  projects_submitted: number;
  last_active: string | null;
}

export interface StudentDetail {
  student: StudentRow;
  interests: string[];
  courses: { course_id: string; title: string; completed_lessons: number; lesson_count: number; percent: number }[];
  results: { assessment_title: string; percent: number; completed_at: string | null }[];
  projects: { id: string; title: string; status: ProjectStatus; score: number | null }[];
}

export interface StaffLesson {
  id: string;
  title: string;
  order_index: number;
  duration_min: number;
  colab_url: string | null;
  content_md: string;
}

export interface StaffCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  level: EducationLevel;
  category: string;
  estimated_hours: number;
  is_published: boolean;
  is_demo: boolean;
  created_by_name: string | null;
  can_edit: boolean;
  lesson_count: number;
  updated_at: string;
}

export interface StaffCourseDetail extends StaffCourse {
  lessons: StaffLesson[];
}

export interface AuditEntry {
  id: string;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown>;
  ip: string | null;
  created_at: string;
}

export interface AdminDashboard {
  stats: { students: number; teachers: number; admins: number; active_7d: number; new_30d: number; deactivated: number };
  students_by_level: LabelCount[];
  signups: DayCount[];
  lessons_completed: DayCount[];
  ai_messages: DayCount[];
  content: {
    courses_published: number;
    lessons: number;
    assessments: number;
    challenges: number;
    careers: number;
    opportunities_verified: number;
  };
  queues: { opportunities_pending: number; achievements_pending: number; projects_submitted: number };
  recent_audit: AuditEntry[];
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  education_level: EducationLevel | null;
  institution: string | null;
  is_minor: boolean;
  teacher_verified: boolean | null;
}

export interface UserPage {
  items: AdminUser[];
  total: number;
}

// ---------- Phase 5: Career Navigator ----------

export interface CareerCard {
  id: string;
  slug: string;
  title: string;
  field: string;
  summary: string;
  is_demo: boolean;
  match: number;
  reasons: string[];
  is_goal: boolean;
}

export interface CareerDetail extends CareerCard {
  description_md: string;
  skills: { name: string; have: boolean; evidence: string | null }[];
  education_paths: string[];
  courses: { slug: string; title: string; level: EducationLevel; is_demo: boolean; status: ProgressStatus; percent: number }[];
  opportunities: { id: string; title: string; category_label: string; deadline: string | null }[];
  goal_note: string | null;
}

export interface CareerPlan {
  steps: { title: string; detail: string }[];
  note: string;
}

/** "3 hours ago" style relative time. */
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const units: [number, string][] = [[60, "minute"], [3600, "hour"], [86400, "day"], [604800, "week"]];
  if (s >= 2592000) return formatDay(iso);
  let [div, name] = units[0];
  for (const u of units) if (s >= u[0]) [div, name] = u;
  const n = Math.floor(s / div);
  return `${n} ${name}${n === 1 ? "" : "s"} ago`;
}
