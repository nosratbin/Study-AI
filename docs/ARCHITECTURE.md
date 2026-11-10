# LEARN AI — Architecture & Plan

Status: Phase 1 in progress. This document covers the planning deliverables
A–E and is updated at the end of each phase.

---

## A. System architecture

```
 ┌──────────────────────┐     ┌──────────────────────┐
 │  Web (Next.js, TS)   │     │ Android (Expo RN, TS)│   ← Phase 5
 │  Tailwind, App Router│     │ NativeWind           │
 └─────────┬────────────┘     └─────────┬────────────┘
           │ /api/* (same-origin         │ HTTPS + Bearer token
           │ rewrite → httpOnly cookies) │
           ▼                             ▼
 ┌──────────────────────────────────────────────────────┐
 │            FastAPI backend (Python, one service)      │
 │  middleware: request-id logging · CORS · rate limit   │
 │  auth: own JWT (access + refresh) · RBAC dependencies │
 │  routers: auth, students, courses*, learning*,        │
 │           assessment*, ai*, opportunities*, mindcare*,│
 │           skills*, google*, teacher*, admin*          │
 │  services: firebase token verify, dashboard, LLM*,    │
 │            RAG*, Google APIs*                          │
 └───────┬───────────────┬────────────────┬─────────────┘
         │               │                │
         ▼               ▼                ▼
 ┌──────────────┐ ┌──────────────┐ ┌───────────────────────┐
 │ PostgreSQL   │ │ Firebase Auth│ │ Gemini API* · Google   │
 │ (hosted) +   │ │ (Google ID   │ │ Drive/Calendar/Docs*   │
 │ pgvector*    │ │  token issue)│ │ (server-side OAuth)    │
 └──────────────┘ └──────────────┘ └───────────────────────┘
                                        * = later phase
```

Key decisions

| Concern | Decision | Why |
|---|---|---|
| Identity | Backend issues its own JWTs. Email/password is handled by the backend (bcrypt). Google sign-in uses Firebase on the client; the backend verifies the Firebase ID token and then issues its own JWT. | One permission model for web + mobile, enforced on the server. Works without Firebase configured. |
| Web session | Next.js rewrites `/api/*` to the backend, so auth cookies are first-party, `httpOnly`, `SameSite=Lax`. | Tokens never reach JS on the web. |
| Mobile session | The same endpoints return tokens in the body; stored in `expo-secure-store`. | No cookies on native. |
| Google APIs (Drive, Calendar, Docs) | Separate server-side OAuth 2.0 flow (`/api/google/connect`) with minimum incremental scopes. Refresh tokens are encrypted at rest (Fernet) in `google_connections`. | Firebase sign-in tokens do not carry Drive/Calendar scopes and must not live on the client. |
| LLM | Provider interface (`services/llm`) with a Gemini implementation; key only on the server. | Swappable provider, no client keys. |
| RAG | `knowledge_chunks` table with a pgvector `embedding` column (added by migration when Postgres is used). | One database; no extra vector store. |
| Scoring | Assessment scores come only from stored answer keys. The LLM may *explain* results, never produce them. | Spec requirement. |
| MindCare data | Separate tables, never joined into academic/ranking queries; only the owner and (opt-in) assigned counsellor can read them. | Privacy, spec requirement. |
| Minors | `birth_year` (not full DOB) → `is_minor`. Minors need guardian acknowledgement at onboarding; stricter defaults (private passport, no public profile). | Collect minimum PII. |
| Rate limiting | In-process sliding window per IP+route (MVP). Swap to Redis for multi-instance. | No extra infra for the demo. |
| Audit | `audit_logs` written for sensitive admin actions (role changes, verification, deletions). | Spec requirement. |

---

## B. Folder structure

```
Tech AI/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md        ← this file
│   └── DESIGN_SYSTEM.md       ← Figma-ready tokens & components
├── backend/                   FastAPI service
│   ├── requirements*.txt
│   ├── .env.example
│   ├── alembic.ini
│   ├── alembic/versions/      migrations
│   ├── app/
│   │   ├── main.py            app factory, middleware, routers
│   │   ├── core/              config, security (JWT/bcrypt), deps (auth/RBAC),
│   │   │                      rate_limit, logging, errors
│   │   ├── db/                Base, session
│   │   ├── models/            SQLAlchemy models (all tables)
│   │   ├── schemas/           Pydantic request/response models
│   │   ├── api/routes/        one router per module
│   │   ├── services/          business logic (firebase, dashboard, llm*, rag*, google*)
│   │   └── seed.py            demo data (clearly labelled)
│   └── tests/
├── web/                       Next.js app
│   └── src/
│       ├── app/
│       │   ├── (public)/      home, about, programs, levels, opportunities,
│       │   │                  features, contact
│       │   ├── (auth)/        login, register
│       │   └── (app)/         onboarding, dashboard, …student/teacher/admin
│       ├── components/
│       │   ├── ui/            Button, Card, Input, Badge, … (design system)
│       │   └── layout/        public nav/footer, app shell
│       └── lib/               api client, auth context, firebase, validation
└── mobile/                    Expo app (Phase 5)
```

---

## C. Database schema

All tables: UUID primary key `id`, `created_at`, `updated_at` (UTC). Enums are
stored as validated strings (portable, easy to extend).

| Table | Key columns | Notes |
|---|---|---|
| **users** | email (unique, idx), password_hash (nullable for Google-only), full_name, role `student/teacher/admin`, firebase_uid (unique), is_active, token_version, last_login_at | `token_version` bump revokes all refresh tokens |
| **student_profiles** | user_id (FK unique), education_level `school/college/university`, institution, class_or_year, district, birth_year, is_minor, guardian_consent_at, preferred_language `en/bn`, interests (JSON), onboarding_completed, recommended_level, passport_token (unique), passport_shared_at | |
| **teacher_profiles** | user_id (FK unique), institution, expertise (JSON), bio, is_verified | |
| **courses** | title, slug (unique), description, level, category, created_by → users, is_published, estimated_hours, order_index | idx (level, is_published) |
| **lessons** | course_id → courses, title, content_md, order_index, duration_min, colab_url | idx (course_id, order_index) |
| **assessments** | title, topic, level, course_id (nullable), created_by, time_limit_min, is_published | |
| **assessment_questions** | assessment_id, prompt, options (JSON), correct_option (int), explanation, topic_tag, order_index | answer key never sent to client |
| **assessment_results** | user_id, assessment_id, score, max_score, answers (JSON), topic_breakdown (JSON), recommended_level, completed_at | |
| **learning_progress** | user_id, course_id, lesson_id (nullable), status `not_started/in_progress/completed`, percent, completed_at | unique (user_id, lesson_id) |
| **ai_conversations** | user_id, title, language, course_id (nullable) | |
| **ai_messages** | conversation_id, role `user/assistant`, content, tokens, sources (JSON) | idx (conversation_id, created_at) |
| **projects** | user_id, title, description, level, challenge_id, repo_url, colab_url, documentation, status `draft/submitted/reviewed`, feedback, reviewed_by, score, is_public, submitted_at, reviewed_at | |
| **project_challenges** *(Phase 4)* | title, slug (unique), level, summary, brief_md, skills (JSON), estimated_hours, starter_url, order_index, is_published, is_demo | idx (level, is_published) |
| **opportunities** | title, description, category, eligibility, education_levels (JSON), deadline, required_documents (JSON), official_url, provider, verification_status `unverified/verified/rejected`, verified_by, verified_at, source_note | only `verified` shown to students |
| **saved_opportunities** | user_id, opportunity_id | unique pair |
| **applications** | user_id, opportunity_id, status `planned/applied/accepted/rejected`, notes, applied_at | unique pair |
| **mood_checkins** | user_id, mood (1–5), note (Fernet-encrypted), tags (JSON) | isolated; owner-only |
| **support_resources** *(Phase 4)* | name, kind `helpline/counsellor/organisation`, description, phone, url, hours, languages (JSON), cost_note, verification_status, verified_by, verified_at, source_note | only `verified` shown to students |
| **support_requests** *(Phase 4)* | user_id, topic, message_enc, preferred_contact, phone_enc, status `open/in_progress/closed`, handled_by, handled_at | encrypted; admin inbox audited |
| **study_tasks** *(Phase 4)* | user_id, title, due_on (date), planned_minutes, status `todo/done`, done_at, lesson_id, notes | idx (user_id, due_on) |
| **skill_records** | user_id, kind `course/skill/award/scholarship/competition/sport/cultural/leadership/volunteering/project`, title, description, evidence_url, issued_by, achieved_on, verification_status, verified_by, verified_at, review_note, is_public | |
| **certificates** | user_id, course_id, title, certificate_code (unique), issued_at | unique (user_id, course_id); issued on course completion |
| **mentorship_sessions** | mentor_id, student_id, topic, scheduled_at, meet_url, status, notes | |
| **notifications** | user_id, title, body, kind, link, read_at | idx (user_id, read_at) |
| **google_connections** | user_id (unique), google_sub, scopes (JSON), refresh_token_enc, access_token_enc, expires_at, calendar_id | tokens encrypted |
| **audit_logs** | actor_id, action, target_type, target_id, details (JSON), ip | admin actions |
| **contact_messages** | name, email, subject, message, handled | public contact form |
| **knowledge_chunks** *(Phase 2)* | source, title, level, content, embedding vector(768) | pgvector |

---

## D. UI screen hierarchy

```
Public (/)
├── Home · About · Programs · Learning Levels · Opportunities · Features · Contact
└── Login · Register (email/password, Google)

Student (/app)                       bottom nav on mobile: Home · Learn · AI Tutor · Opportunities · Profile
├── Onboarding (level → profile → interests → guardian ack if minor)
├── Dashboard
├── Learn
│   ├── AI Learning Center (courses by level) → Course → Lesson
│   ├── Learning Roadmap
│   ├── Quiz & Assessment (skill assessment, topic tests, results)
│   └── AI Project Lab (challenges, projects, submit)
├── AI Tutor (conversations, chat)
├── Opportunities (Hub, Matcher, Saved, Applications)
├── Career Navigator
├── MindCare (check-in, journal, exercises, counsellors, request help)
├── Study Planner
├── Skill Passport (+ public share link)
├── Notifications · Google Workspace · Profile · Settings

Teacher (/teacher)
├── Dashboard · Courses → Lessons · Quizzes · Student analytics · Project review · Mentorship

Admin (/admin)
├── Dashboard · Students · Teachers · Courses · Opportunities (verify)
├── Content moderation · AI knowledge base · Platform analytics · Audit log
```

---

## E. Development milestones

| Phase | Scope | Exit criteria |
|---|---|---|
| **1** | Repo setup, design system, auth (email + Google via Firebase), full DB schema + migration, onboarding, student dashboard, public site | Backend tests pass; web builds; register → onboarding → dashboard works against Postgres |
| **2** | Courses/lessons, AI Tutor (Gemini, bn/en, level-aware, history, RAG), skill assessment (answer-key scoring), roadmap | Demo steps 4–7 work |
| **3** | Opportunity Hub + admin verification + matcher, Google OAuth connect, Drive + Calendar (+ Docs) | Demo steps 8–9 work with real Google project |
| **4** | Project Lab, Skill Passport (+ share link), MindCare, Study Planner | Demo step 10 works |
| **5** | Teacher + Admin dashboards, Expo Android app, notifications | Android build runs on test phone |
| **6** | Test hardening, security review, deployment, demo script | Live deployment + rehearsed demo |
