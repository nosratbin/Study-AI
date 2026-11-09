# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

LEARN AI: an AI education platform MVP for Bangladeshi students (school/college/university levels). It is built in phases (see `docs/ARCHITECTURE.md`, section E). After each phase: report what was built, the files, the setup steps, the test results and any unconfigured integrations, then **wait for the user to confirm before starting the next phase**.

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
  - `src/components/vengeance/` is the vendored VengeanceUI registry (all components, lint-ignored). Its shadcn vars map to the brand in `globals.css`. Use `bg-muted-bg` for shadcn's muted background, because `text-muted` is our secondary text colour. `dark:` only applies under a `.dark` ancestor.
  - `(app)/layout.tsx` wraps everything in `<Suspense>`, because with `cacheComponents` the `usePathname`/`useParams`/`useSearchParams` hooks suspend on dynamic routes and the build fails without a boundary.
- **Opportunities**: student routes (`opportunities.py`) must only use `verified_query()`/`get_verified()` from `app/services/opportunities.py`. Admin CRUD/verify lives in `admin.py` and writes `AuditLog`. The matcher is rule-based (no LLM).
- **Google Workspace**: `app/services/google.py` does OAuth (PKCE, a signed `la_gstate` cookie on path `/api/google`) and Drive/Docs/Calendar REST over httpx. Tests patch `google._client` with `httpx.MockTransport` and `google.verify_id_token`. Tokens are Fernet-encrypted (`GOOGLE_TOKEN_KEY`). Only an `invalid_grant` refresh error deletes a connection.
- **Sessions**: tokens carry `jti` and `sid`. Logout writes both to `revoked_tokens` (`sid:<id>` keys); `is_revoked(db, payload)` checks both.
- **AI**: `app/services/llm.py` (Gemini REST; tests override `get_llm` with `tests/fakes.py:FakeLLM`), `rag.py` (chunk, embed, pgvector cosine retrieve), `tutor.py` (prompts). Tutor quizzes are practice-only, never stored.
- **Module availability**: unreleased modules show as disabled nav items. Flip `available` in `NAV`/`BOTTOM` (`app-shell.tsx`) and `MODULES`/`CURRENT_PHASE` (`backend/app/services/dashboard.py`) when a phase ships.
- **Client and server validation**: they are mirrored. `web/src/lib/validation.ts` (zod) must match the backend Pydantic schemas: password rules and the minor rule `currentYear - birth_year <= 18`.

## Product rules that constrain code

- Assessment scores come only from stored answer keys (`assessment_questions.correct_option`, never sent to students). The LLM must not produce official scores.
- Only `verification_status == verified` opportunities are shown to students. Never seed or invent scholarships, deadlines or application URLs.
- MindCare tables (`mood_checkins`) must never be read by academic or dashboard code (there is a test for this).
- Seeded content is flagged `is_demo=True` and labelled "Demo" in the UI.
- API keys (Gemini, Google OAuth secrets) stay server-side only. Google tokens are stored encrypted in `google_connections`.
- Don't claim an integration works until it has been configured and tested. `/api/health` reports which integrations are configured.
