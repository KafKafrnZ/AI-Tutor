# Deployment Guide — Ascend AI

Full deployment guide for Railway (backend) + Vercel (frontend).

---

## Prerequisites

- GitHub repo: `https://github.com/KafKafrnZ/AI-Tutor`
- All GitHub Actions must be green on `main` before deploying
- A Railway account and a Vercel account

---

## 1. Railway — Backend

### Step-by-step

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select `KafKafrnZ/AI-Tutor`
3. Set **Root Directory**: `backend`
4. Railway will detect the `Dockerfile` automatically

### Required Environment Variables

Set all of these in Railway → Project → Variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Railway provides this automatically if you add a Postgres plugin) |
| `JWT_SECRET` | Strong random secret — generate with `openssl rand -hex 32` |
| `LLM_API_KEY` | Your LLM provider API key (Groq, etc.) |
| `LLM_BASE_URL` | LLM provider base URL (e.g. `https://api.groq.com/openai/v1`) |
| `LLM_MODEL` | Model name (e.g. `llama-3.3-70b-versatile`) |
| `ENVIRONMENT` | `production` |
| `BACKEND_CORS_ORIGINS` | `["https://your-app.vercel.app"]` |
| `ALLOWED_ORIGINS` | `["https://your-app.vercel.app"]` (for CSRF protection) |
| `WEB_CONCURRENCY` | `2` (set `REDIS_URL` if > 1) |

### Optional Variables

| Variable | Description |
|---|---|
| `REDIS_URL` | Redis connection string — required when `WEB_CONCURRENCY > 1` |
| `SENTRY_DSN` | Sentry DSN for backend error tracking |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASSWORD` / `EMAIL_FROM` | Email service for account verification |
| `FRONTEND_URL` | Your Vercel URL — used in email verification links |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Default: `60` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Default: `30` |
| `DB_POOL_SIZE` | Default: `5` (free tier Postgres: keep at 5) |
| `DB_MAX_OVERFLOW` | Default: `10` |
| `ALLOW_FALLBACK_QUESTIONS` | `true` for demo mode, `false` for production |
| `REQUIRE_EMAIL_VERIFICATION` | Defaults to `true` in production if unset; explicit `false` disables |
| `RAG_CHROMA_PATH` | Chroma directory. Defaults to `$RAILWAY_VOLUME_MOUNT_PATH/chroma`, else `/data/chroma` |
| `PYQS_SOURCE` | PYQ JSON path. Default: `/app/data/pyqs.json` |

### Volume (required in production)

Attach a Railway volume and set `RAILWAY_VOLUME_MOUNT_PATH` to its mount (e.g. `/data`). The start script writes Chroma under `$RAILWAY_VOLUME_MOUNT_PATH/chroma` unless `RAG_CHROMA_PATH` is set. Without a volume, production boot fails because `RAG_REQUIRE_PERSISTENT_CHROMA` rejects an ephemeral path.

### Startup

`scripts/start.sh` (Dockerfile CMD **and** `railway.toml` startCommand) runs:

1. `alembic upgrade head`
2. `python -m data.ingest` (skipped if the collection already has ≥100 docs)
3. `uvicorn`

**First boot is slow** (fastembed model download + indexing). Later boots skip ingest when the volume already has data. If ingest fails, the process exits non-zero and Railway marks the deploy failed — that is intentional.

### Post-deploy Verification

- `GET https://your-app.railway.app/health` → should return `{"status":"ok","database":"connected",...}`
- Railway deploy logs should show `start.sh: chroma=...` then either `Indexed N new chunks` or `Skipping ingest`
- Alembic migrations run **automatically** on startup — check Railway deploy logs to confirm

---

## 2. Vercel — Frontend

### Step-by-step

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import `KafKafrnZ/AI-Tutor`
2. Set **Framework Preset**: Next.js
3. Set **Root Directory**: `frontend`
4. Click **Deploy**

### Required Environment Variables

Set in Vercel → Project → Settings → Environment Variables:

| Variable | Description |
|---|---|
| `BACKEND_API_URL` | Your Railway backend URL (e.g. `https://your-app.railway.app`) |

### Optional Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for frontend error tracking |

### Security Headers

`vercel.json` in `frontend/` automatically adds:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: microphone=(self)` — required for the Voice Input feature

---

## 3. Local Development (Docker Compose)

```bash
# 1. Copy env templates
cp backend/.env.example backend/.env.local
cp frontend/.env.example frontend/.env.local

# 2. Fill in required values in both .env.local files

# 3. Start everything
docker compose up --build
```

This starts: PostgreSQL, Redis, FastAPI backend (with auto-migration + fastembed warmup), and the Next.js frontend.

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 4. Zero-Downtime Deploy Checklist

Run through this before every production deploy:

- [ ] All GitHub Actions green on `main` (backend-ci, frontend-ci, deploy-gate)
- [ ] `alembic upgrade head` runs clean in CI (checked by `backend-ci.yml`)
- [ ] `GET /health` returns 200 on Railway with `"database":"connected"`
- [ ] Login → dashboard flow works end-to-end on Vercel
- [ ] Token refresh (`POST /auth/refresh`) works (wait 61 minutes or test manually)
- [ ] Voice input has microphone permission on mobile (requires HTTPS)

---

## 5. Database Migrations

Migrations are managed with Alembic and run automatically at startup.

```bash
# Generate a new migration (run inside the backend container or with venv)
alembic revision --autogenerate -m "describe your change"

# Manual apply (usually not needed — runs on startup)
alembic upgrade head

# Roll back one migration
alembic downgrade -1
```

Migration files live in `backend/alembic/versions/`.
