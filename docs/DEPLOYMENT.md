# Deploying IccheGhuri to Railway

Production runs as two Railway services, both built from this repo:

| Service | Root directory | Build | Public domain |
|---|---|---|---|
| backend | `/backend` | `backend/Dockerfile` (Python 3.14, uvicorn) | none (private network only) |
| web | `/web` | Railpack auto-detects Next.js + pnpm (`pnpm build` / `pnpm start`) | yes |

The browser talks only to the web service. Next.js rewrites `/api/*` to `BACKEND_URL`, which points at the backend's private Railway address, so cookies stay first-party and the backend never gets a public URL.

Railway suits this app better than Vercel. The backend is an always-on process, so:
- the Supabase **session pooler** URL we already use works as-is;
- the in-memory login and AI rate limits behave correctly with one instance.

No code changes were needed beyond the Dockerfile.

## 1. Push to GitHub

Railway deploys from `main` of `nosratbin/Study-AI`. Every push to `main` redeploys both services.

## 2. Create the project

1. Go to https://railway.com/new and choose **Deploy from GitHub repo**, then pick `nosratbin/Study-AI`.
2. You will end up with two services from the same repo, set up as described below.

## 3. Backend service

**Settings**
- **Root Directory:** `/backend`. Railway picks up the Dockerfile automatically.
- **Healthcheck Path:** `/api/health`.
- **Pre-deploy Command:** `alembic upgrade head`. This runs database migrations on every deploy. The database is already at head (0006).
- **Do not** generate a public domain.

**Variables**

| Variable | Value |
|---|---|
| `PORT` | `8000` |
| `ENVIRONMENT` | `production` |
| `COOKIE_SECURE` | `true` |
| `DATABASE_URL` | Same as `backend/.env.local` (Supabase session pooler, `aws-0-ap-south-1.pooler.supabase.com:5432`) |
| `JWT_SECRET` | New random value, 32+ characters (`python -c "import secrets; print(secrets.token_urlsafe(48))"`) |
| `DATA_ENCRYPTION_KEY` | **Same** key as `backend/.env.local`. A different key makes existing MindCare notes and support requests unreadable |
| `GOOGLE_TOKEN_KEY` | Same as `backend/.env.local` (otherwise users must reconnect Google) |
| `GEMINI_API_KEY` | From `backend/.env.local` |
| `FIREBASE_PROJECT_ID` | From `backend/.env.local` |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | From `backend/.env.local` |
| `WEB_APP_URL` | `https://<your-site>` |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://<your-site>/api/google/callback` |
| `CORS_ORIGINS` | `["https://<your-site>"]` (JSON list) |

**Notes on the Dockerfile**
- It starts `python -m app.serve`, which runs uvicorn on one dual-stack socket that accepts both IPv4 and IPv6. Railway's healthcheck connects over IPv4, and the private network may use IPv6. Plain `uvicorn --host ::` is IPv6-only (asyncio sets `IPV6_V6ONLY`), so the healthcheck would never reach it.
- It runs with proxy headers on, so the rate limiter sees the visitor's IP. Next.js forwards `X-Forwarded-For` through the rewrite.
- `.dockerignore` keeps `.env*`, `.venv` and tests out of the image.

## 4. Web service

**Settings**
- **Root Directory:** `/web`.
- **Networking:** use **Generate Domain**. This gives `<name>.up.railway.app`, which is `<your-site>` above. A custom domain can be attached instead.

**Variables.** Set these **before the first build**, because Next.js bakes them into the build.

| Variable | Value |
|---|---|
| `BACKEND_URL` | `http://${{backend.RAILWAY_PRIVATE_DOMAIN}}:8000` (use the backend service's actual name in place of `backend`) |
| `NEXT_PUBLIC_FIREBASE_*` | Every one of them, from `web/.env.local` |

## 5. Google Cloud and Firebase

- [OAuth clients](https://console.cloud.google.com/auth/clients): open the web client.
  - Add `https://<your-site>` under **Authorized JavaScript origins**.
  - Add `https://<your-site>/api/google/callback` under **Authorized redirect URIs**.
- [Firebase console](https://console.firebase.google.com/): go to Authentication → Settings → **Authorized domains** and add `<your-site>`. Without this, Google Sign-In fails.
- [Audience](https://console.cloud.google.com/auth/audience): while the app is in Testing mode, add every judge's Google account as a test user (up to 100). Only test users can connect Drive and Calendar. Publishing may require Google verification, which is too slow for a competition.

## 6. Verify

- Open `https://<your-site>/api/health`. It should report `postgresql`, and `google_signin`, `gemini` and `google_workspace` should all be `true`.
- Then sign in, open a course, ask the AI Tutor a question, and connect Google at `/google`.

## Cost, timing, demo-day checklist

**Cost:** Railway gives trial credit, then the Hobby plan is about $5/month including usage, which covers two small services. Check current numbers at https://railway.com/pricing.

**Build time:** the first deploy takes about 2–3 minutes for the backend and 3–5 minutes for the web service. Later deploys are similar.

**Demo-day checklist**
- **Supabase free tier** pauses inactive projects after about a week. Open the site the day before.
- **Gemini free tier** has per-minute limits. With many simultaneous users, some see "AI is busy". A paid key avoids this.
- **Production data:**
  - Demo accounts (`@demo.iccheghuri.local`) can only log in when `ENVIRONMENT` is not `production`, so they don't work on Railway. Create real staff accounts for the live site; an admin can then promote others on Admin → Users.
  - Verified MindCare support resources don't exist until you create them.
  - The database is shared with local development, so anything seeded locally also appears in production.

## Sources

- [Railway private networking](https://docs.railway.com/private-networking)
- [Railway: deploying a monorepo](https://docs.railway.com/guides/deploying-a-monorepo)
- [Railway: "No start command could be found"](https://docs.railway.com/deployments/troubleshooting/no-start-command-could-be-found)
- [Railway community: uvicorn not found using Railpack](https://station.railway.com/questions/uvicorn-not-found-using-railpack-d3d88025)
- [Railway community: Next.js and backend over private networking](https://station.railway.com/questions/nextjs-and-node-server-not-able-to-commu-15437463)
- [FastAPI health check with IPv6 on Railway](https://answeroverflow.com/m/1224800026291863624)
- [Railway template: Next.js + FastAPI starter](https://railway.com/deploy/nextjs-fastapi-full-stack-starter.md)
- [Supabase: connecting to Postgres (poolers)](https://supabase.com/docs/guides/database/connecting-to-postgres)
