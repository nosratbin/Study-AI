# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

IccheGhuri: an AI education platform MVP for Bangladeshi students (school/college/university levels). It is built in phases (see `docs/ARCHITECTURE.md`, section E). After each phase: report what was built, the files, the setup steps, the test results and any unconfigured integrations, then **wait for the user to confirm before starting the next phase**.

## Commands

Backend (run from `backend/`, venv at `backend/.venv`):
```bash
.venv/Scripts/python -m pytest                                   # all API tests (in-memory SQLite)
.venv/Scripts/python -m pytest tests/test_auth.py::test_name     # single test
.venv/Scripts/uvicorn app.main:app --reload --port 8000          # dev server, docs at /api/docs
.venv/Scripts/alembic upgrade head                               # apply migrations to DATABASE_URL
.venv/Scripts/alembic revision --autogenerate -m "msg"           # new migration
DATABASE_URL="postgresql://u:p@h/x" .venv/Scripts/alembic upgrade head --sql   # check Postgres DDL offline
.venv/Scripts/python -m app.seed [--demo-users]                  # demo courses, assessments / accounts
.venv/Scripts/python -m app.services.rag                         # embed lessons into knowledge_chunks (needs GEMINI_API_KEY)
```

Web (run from `web/`, pnpm):
```bash
pnpm dev | pnpm build | pnpm lint | pnpm typecheck | pnpm test   # test = vitest run
pnpm vitest run src/lib/validation.test.ts -t "name"             # single test
```
`pnpm typecheck` depends on the route types that Next.js generates in `.next/types`. Run `pnpm build` (or `pnpm dev`) first, or it fails on stale or missing types.

## Architecture

- **One FastAPI backend** serves both web and the future Expo app. All routes are under `/api` (`app/main.py`), with one router per module in `app/api/routes/`.
- **Auth model**: the backend issues its own JWTs (`app/core/security.py`).
  - Web gets them as httpOnly cookies `la_access` (path `/`) and `la_refresh` (path `/api/auth`).
  - Clients sending `X-Client-Type: mobile` get the tokens in the response body instead.
  - Google Sign-In: the client gets a Firebase ID token, `/api/auth/google` verifies it with google-auth (`app/services/firebase.py`), and the backend then issues its own JWT.
  - `users.token_version` revokes all of a user's sessions. Roles are always read from the DB, never from token claims.
  - Email verification (`services/verification.py`, `services/email.py`): `/register` returns `{email, resend_after}` and no session. One email carries a 6-digit code and a `/verify-email#token=` link (both stored as HMAC hashes). Unverified accounts can't log in (403 `email_unverified` sends a fresh code). Google sign-in counts as verified. Plus-aliases are rejected on both client and server. Mail goes via Resend's HTTPS API when `RESEND_API_KEY` is set (Railway below Pro blocks SMTP ports), else SMTP. Without either, dev logs the mail and tests read `email.OUTBOX`, while production returns 503. To send email after raising `ApiError`, pass `background=tasks`, because an endpoint's own tasks are dropped when it raises.
- **RBAC** lives in `app/core/deps.py` (`StudentUser`, `TeacherUser`, `AdminUser` annotated deps). Enforce permissions there, not in the UI. Self-registration only creates students.
- **Errors** always use the shape `{"error": {code, message, request_id, details?}}` (`app/core/errors.py`). Raise `ApiError(status, code, message)`. The web `ApiError.fieldErrors()` maps validation `details` onto form fields.
- **Models**:
  - All tables live in `app/models/` (`user.py`, `learning.py`, `activity.py`) and use UUID PKs plus timestamp mixins.
  - Enums are `str_enum(...)`: VARCHAR plus a CHECK constraint, never native PG enums, so migrations stay portable between SQLite (tests) and Postgres (prod).
  - Alembic uses the naming convention in `app/db/base.py`. Register new model modules in `app/models/__init__.py`.
- **Web**:
  - Next.js 16 with `cacheComponents` on. **Read `web/node_modules/next/dist/docs/` before using Next APIs**, because this version differs from older Next.js (e.g. `middleware` → `proxy`, async request APIs).
  - `next.config.ts` rewrites `/api/*` to `BACKEND_URL`, so the browser only calls same-origin `/api` through `src/lib/api.ts`, which auto-refreshes on a 401.
  - Authenticated pages are client components behind `RequireAuth`/`AppShell` (`src/components/layout/app-shell.tsx`). Route groups: `(public)`, `(auth)`, `(setup)` (onboarding), `(app)`.
  - Design tokens are in `src/app/globals.css` `@theme` (brand orange `#F97316`). Shared UI is in `src/components/ui/index.tsx`. The spec is in `docs/DESIGN_SYSTEM.md`.
  - Brand: the product was renamed from LEARN AI to IccheGhuri. `python brand/src/build.py` regenerates the outlined logo masters in `brand/logo/` (the guide is `brand/brand-guide.html`, built by `brand/src/guide.py`). The web app uses copies in `web/public/brand/` through `Logo` in `components/ui`, plus `src/app/icon.svg`, `apple-icon.png`, `favicon.ico` and `manifest.ts`. After rebuilding, copy the changed SVGs over. A few internal keys keep the old prefix on purpose: the `la_*` cookies, the dev data-key seed in `core/crypto.py` and the Drive `learnai_lesson` property.
  - `src/components/vengeance/` is the vendored VengeanceUI registry (all components, lint-ignored). Its shadcn vars map to the brand in `globals.css`. Use `bg-muted-bg` for shadcn's muted background, because `text-muted` is our secondary text colour. `dark:` only applies under a `.dark` ancestor.
  - `(app)/layout.tsx` wraps everything in `<Suspense>`, because with `cacheComponents` the `usePathname`/`useParams`/`useSearchParams` hooks suspend on dynamic routes and the build fails without a boundary.
- **Opportunities**: student routes (`opportunities.py`) must only use `verified_query()`/`get_verified()` from `app/services/opportunities.py`. Admin CRUD/verify lives in `admin.py` and writes `AuditLog`. The matcher is rule-based (no LLM). `Opportunity.tags` share the course skill vocabulary (`machine-learning`) and link opportunities to courses.
- **Course catalogue**: `app/catalog.py` lists the 22 catalogue courses (skills, digital-library `resources`, and an `outline` for courses without lessons). `seed_catalog` in `seed_full_courses.py` syncs it idempotently: a course gets lessons from `app/content/courses/<slug>.md` once that file exists, otherwise it shows as "Coming soon" (`CourseCard.coming_soon`) with its outline. Old demo courses in `RETIRED_DEMO_SLUGS` are unpublished, not deleted. `services/course_links.py` links a course to projects, careers and verified opportunities by shared tags. The roadmap never makes an empty stage current. `python scripts/check_library_links.py` checks every library URL.
- **Google Workspace**: `app/services/google.py` does OAuth (PKCE, a signed `la_gstate` cookie on path `/api/google`) and Drive/Docs/Calendar REST over httpx. Tests patch `google._client` with `httpx.MockTransport` and `google.verify_id_token`. Tokens are Fernet-encrypted (`GOOGLE_TOKEN_KEY`). Only an `invalid_grant` refresh error deletes a connection.
- **Sessions**: tokens carry `jti` and `sid`. Logout writes both to `revoked_tokens` (`sid:<id>` keys); `is_revoked(db, payload)` checks both.
- **Phase 4 modules**: `growth.py` models (challenges, study tasks, support directory/requests). Routes: `projects.py`, `skills.py` (passport, plus `public_router` for `/api/public/*`), `mindcare.py`, `planner.py`, and `admin_care.py`. Certificates are issued in `services/passport.py` when a course's lessons are all completed.
- **Encryption at rest**: `app/core/crypto.py` `seal`/`unseal` (Fernet, `DATA_ENCRYPTION_KEY`; production refuses to start without it). Use it for MindCare notes and support requests. Mood numbers stay plain.
- **AI**: `app/services/llm.py` (Gemini REST with a model fallback chain `GEMINI_MODEL` + `GEMINI_FALLBACK_MODELS`; tests override `get_llm` with `tests/fakes.py:FakeLLM`), `rag.py` (chunk, embed, pgvector cosine retrieve), `tutor.py` (prompts). Tutor quizzes are practice-only, never stored.
- **Module availability**: unreleased modules show as disabled nav items. Flip `available` in `NAV`/`BOTTOM` (`app-shell.tsx`) and `MODULES`/`CURRENT_PHASE` (`backend/app/services/dashboard.py`) when a phase ships.
- **Institution and district suggestions**: `GET /api/meta/institutions?q=&level=` and `/api/meta/districts` (public) search `backend/app/data/*.json` via `services/edu_directory.py`. `python scripts/build_edu_data.py` regenerates the JSON from Wikidata, Hipo and nuhil/bangladesh-geocode. The web `Combobox` (`components/ui/combobox.tsx`) only suggests; any typed value is still saved.
- **Client and server validation**: they are mirrored. `web/src/lib/validation.ts` (zod) must match the backend Pydantic schemas: password rules and the minor rule `currentYear - birth_year <= 18`.

## Product rules that constrain code

- Assessment scores come only from stored answer keys (`assessment_questions.correct_option`, never sent to students). The LLM must not produce official scores.
- Only `verification_status == verified` opportunities are shown to students. Never invent scholarships, deadlines or application URLs. The only seeded ones are in `app/seed_opportunities.py`, each read on its official page (date and finding in `source_note`); unannounced dates stay `deadline=None`.
- MindCare tables (`mood_checkins`) must never be read by academic or dashboard code (there is a test for this).
- Seeded demo content is flagged `is_demo=True` and labelled "Demo" in the UI. Full courses are the exception: `app/seed_full_courses.py` loads real lessons from `app/content/courses/<slug>.md` (`@module` / `@lesson Title | minutes` markers) with `is_demo=False`. Lessons have an optional `module` heading that groups them on the course page.
- Deploys never migrate or seed: `app.serve` only starts the server. After adding a migration or seed content, run `alembic upgrade head`, `python -m app.seed` and `python -m app.services.rag` against the live database (local config points at it). Re-run rag after a Gemini 429; finished lessons are skipped.
- API keys (Gemini, Google OAuth secrets) stay server-side only. Google tokens are stored encrypted in `google_connections`.
- Don't claim an integration works until it has been configured and tested. `/api/health` reports which integrations are configured.

## For unfamiliar features
For unfamiliar features, don't write from scratch - first search GitHub for open-sorce projects, compare approaches, then get started

<!-- ASTRYX:START -->
Astryx v0.7.16 · 90+ components
CLI: run every command as `astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — start every page from a template, never from scratch:
1. `astryx build "<idea>"` — names the template to scaffold from and the parts it lacks.
2. `astryx template <name> <path>` — scaffold it; keep its frame, gap and padding; replace the content.
3. `astryx template <Block>` for parts it lacks; `astryx component <Name>` to read props before using one.
Changing an existing page? Keep it: skip step 2 and add blocks/components inside its sections.

RULES:
- No <div> — components handle all layout and spacing.
- Read `astryx docs layout` before changing a template's frame.
- Dense data = rows (Table, List/Item), not Card-wrapped lists. Badge = counts only.
- Style with component props first, then tokens (var(--color-*|--spacing-*|--radius-*)). No raw hex/px. No StyleX/Tailwind compiler here — don't use xstyle/utility classes directly. Some templates use StyleX and need a compiler plugin; see `astryx docs styling-overview`.
- THEMES: palettes and custom colors go through the theme, never :root overrides. To make or change a theme (colors, fonts, corners, spacing, a look from a picture), prefer the experimental theme editor over hand-written theme files: `astryx experimental theme editor new <name> --like neutral`, then `editor set <name> <thing> <value>` or `editor how "<what you want>"`; wire it with `astryx theme add <name>`; after each change look at it with `astryx experimental theme editor show <name> --png` and open the PNGs it writes (changes nothing in the app); a theme change is not done until you have looked at the pictures. In code, extend an imported theme to customize it; `theme eject <slug>` only forks source. See `astryx docs theme`.
- SELF-CHECK: re-read the file; replace any raw <div>/<span>, imported .css/@apply, or hardcoded #hex/px with the component or a token.

`astryx help` lists every command. Key ones beyond the workflow:
  search "<query>"   find any component / hook / doc / template
  discover <words>   integrations you could add
  docs <topic>       getting-started, principles, tokens, theme … (`astryx docs` lists all)
  docs cli           commands and API reference
  docs authoring     build an integration package, and every field it holds
  upgrade --from <old version> --apply   run after a dependency bump
<!-- ASTRYX:END -->
