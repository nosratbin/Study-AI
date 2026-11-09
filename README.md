# LEARN AI

National AI education & student development platform for Bangladesh — MVP for the AI Builders Congress, Daffodil International University.

> **Status: Phase 3 complete**: Opportunity Hub (admin-verified scholarships and competitions, matcher, saving, application tracking) and Google Workspace (Docs, Drive, Calendar), on top of Phase 2 (courses, AI Tutor, assessments, roadmap) and Phase 1 (auth, onboarding, dashboard, public site).
> See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for architecture, schema, screen map and milestones.

| Part | Stack | Folder |
|---|---|---|
| API | Python 3.12+ · FastAPI · SQLAlchemy 2 · Alembic | `backend/` |
| Web | Next.js 16 · TypeScript · Tailwind CSS 4 | `web/` |
| Android | Expo · React Native (Phase 5) | `mobile/` |
| Database | PostgreSQL (hosted, e.g. Neon/Supabase) · pgvector | — |
| AI | Gemini (`gemini-2.5-flash`, `gemini-embedding-001`) · RAG over lesson content | — |
| Auth | Backend JWT (httpOnly cookies on web, bearer on mobile) · Google via Firebase Auth | — |

## Prerequisites

- Python 3.12+ and Node 20+ with pnpm
- A PostgreSQL database URL (Neon or Supabase free tier works)
- Optional: a Firebase project for Google Sign-In

## Backend setup

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt
cp .env.example .env              # set DATABASE_URL, JWT_SECRET, FIREBASE_PROJECT_ID
alembic upgrade head              # create tables
python -m app.seed                # demo courses + assessments (labelled "Demo")
python -m app.seed --demo-users   # optional: demo admin/teacher/student, password printed once
python -m app.services.rag       # embed lessons for the AI Tutor (needs GEMINI_API_KEY; re-run after content changes)
uvicorn app.main:app --reload --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1
```

`--proxy-headers` makes per-client rate limits see the real client IP behind the Next.js proxy instead of the proxy's address. Set `--forwarded-allow-ips` to your proxy's address in production.

API docs: http://localhost:8000/api/docs · Health: http://localhost:8000/api/health

## Web setup

```bash
cd web
pnpm install
cp .env.example .env.local        # BACKEND_URL + optional NEXT_PUBLIC_FIREBASE_* values
pnpm dev                          # http://localhost:3000
```

The browser only ever calls `/api/*` on the web origin; Next.js proxies it to `BACKEND_URL`.

## Enabling Google Sign-In

1. Create a Firebase project → Authentication → Sign-in method → enable **Google**.
2. Add a Web app; copy `apiKey`, `authDomain`, `projectId`, `appId` into `web/.env.local`.
3. Set `FIREBASE_PROJECT_ID` in `backend/.env` (the backend verifies ID tokens with Google's public keys; no service-account key needed).
4. Add your deployed domain under Authentication → Settings → Authorized domains.

Until configured, the Google button is shown disabled with an explanation and `/api/auth/google` returns `503 google_signin_not_configured`.

## Enabling the AI Tutor

1. Create a key at https://aistudio.google.com/apikey and set `GEMINI_API_KEY` in `backend/.env`.
2. Restart the API, then run `python -m app.services.rag` to embed lesson content (unchanged lessons are skipped on re-runs).
3. `/api/health` reports `"gemini": true` once configured.

Practice quizzes from the tutor are AI-generated and never stored or scored. Official scores come only from stored answer keys in Skill Assessment.

## Opportunity Hub

Students only ever see opportunities with `verification_status = verified`. Nothing is seeded: an admin adds each one at `/admin/opportunities`, checks it against the official source, and verifies it with a source note. Editing a verified opportunity sends it back to review. Every admin change is written to `audit_logs`.

To create an admin, insert a user with `role = 'admin'`, or run `python -m app.seed --demo-users` for local demo accounts.

## Enabling Google Workspace

1. In Google Cloud (the Firebase project), enable the **Google Drive API** and the **Google Calendar API**.
2. OAuth consent screen: add the scopes `.../auth/drive.file` and `.../auth/calendar.events`. While the app is in Testing mode, add each student's Google account as a test user.
3. Credentials → **OAuth client ID → Web application**. Add the redirect URI `http://localhost:3000/api/google/callback` (in production, `https://<your-domain>/api/google/callback`).
4. Fill `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_TOKEN_KEY` (Fernet key; the command is in `.env.example`) and `WEB_APP_URL` in `backend/.env`, then restart the API.
5. `/api/health` reports `"google_workspace": true`. Then at `/google`, connect Drive and Calendar.

Students choose which features to allow. LEARN AI can only see files it creates (a "LEARN AI" folder of Google Docs) and can only create calendar events. Tokens are Fernet-encrypted in `google_connections`. Disconnecting revokes access at Google.

Open the app on the same host as the redirect URI (`localhost`, not `127.0.0.1`). Otherwise the state cookie is not sent back and the connection fails with "request expired".

## UI components

`web/src/components/ui` holds the LEARN AI design system. `web/src/components/vengeance` holds every VengeanceUI component, vendored and excluded from lint. Its shadcn theme variables are mapped to the brand palette in `globals.css`. The shadcn "muted" background is `bg-muted-bg`, because `muted` is the LEARN AI secondary text colour.

## Tests

```bash
cd backend && .venv/Scripts/python -m pytest          # API: auth, RBAC, onboarding, dashboard, isolation
cd backend && .venv/Scripts/python -m pytest tests/test_auth.py::test_login_success_and_failure   # single test
cd web && pnpm test && pnpm lint && pnpm typecheck && pnpm build
```

Backend tests use in-memory SQLite; migrations are written to run on both SQLite and PostgreSQL.

## Security notes

- No secrets in code. `backend/.env` and `web/.env.local` are git-ignored; templates are `.env.example`.
- Self-registration creates **student** accounts only. Roles are read from the database on every request, never trusted from the token.
- Passwords: bcrypt. Sessions: short-lived access JWT + refresh JWT that share a session id. Logout revokes the whole session server-side, including tokens refreshed from a copied refresh token. "Sign out everywhere" revokes all sessions.
- Login returns the same error for an unknown email, a wrong password and a Google-only account. Registration still returns `409 email_taken`; hiding that needs email verification (no email service yet).
- Auth endpoints are rate-limited (in-process; use Redis when running more than one instance).
- Minors (by birth year) need guardian acknowledgement at onboarding. MindCare data is never read by academic endpoints.
