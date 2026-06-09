# Ascend AI — Project Memory

_Last updated: 2026-06-08. Read this first when starting a new session._

---

## What This Project Is

**Ascend AI** — a full-stack AI tutor for Indian government exam prep (IBPS SO IT Officer focus).
Target: production-quality SaaS, $35k+/yr value, auctionable asset.

- **Frontend**: Next.js 16 (App Router) + Tailwind v4 + Framer Motion — deployed on Vercel
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL + Alembic + ChromaDB (RAG) + Redis — deployed on Railway
- **Auth**: httpOnly JWT cookies (`access_token`)
- **AI**: Llama 3.3 via external LLM API, fastembed for RAG embeddings
- **GitHub repo**: `https://github.com/KafKafrnZ/AI-Tutor`

---

## Current State (as of session end)

### Deployments
- User is **removing Railway and Vercel deployments** to start fresh.
- All code fixes are committed and pushed to `main` on GitHub.
- Fresh clone of `main` = fully working codebase ready for re-deploy.

### What's Already Fixed and Merged to `main`
1. `backend/requirements.txt` — 3 pip dependency conflicts resolved:
   - `ttzdata` → `tzdata` (typo)
   - `tokenizers==0.22.2` → `tokenizers==0.20.3` (chromadb compat)
   - `fastembed==0.3.6` → `fastembed==0.5.0` (numpy 2.x compat)
2. `frontend/app/tutor/page.tsx` — `useSearchParams()` wrapped in `<Suspense>` (Next.js 16 required)
3. `frontend/proxy.ts` — correct Next.js 16 file convention (`proxy.ts`, not `middleware.ts`)
4. `frontend/app/api/[...path]/route.ts` — SSE streaming (`maxDuration=60`, `x-accel-buffering: no`)
5. Phase 4 color tokens applied across dashboard, practice, mock-tests, error-log, progress pages
6. `frontend/app/mistakes/page.tsx` — redirects to `/error-log`
7. `frontend/components/ThreeDExplorer.tsx` — TypeScript R3F prop fixes
8. `.github/workflows/deploy-gate.yml` — CI deploy gate added
9. **Current State Updates**: `cleanup.py` deleted, `ImportError` fixed, exam scope fixed, deployments being rebuilt fresh.

### Completed in June 2026 Session
- **GK-1 → GK-11** (branch `claude/pc-file-access-mnxju`, commit `e1d7c89`):
  - GK-1: Server-side mock grading (no answer leak pre-submit)
  - GK-2: CORS production/dev split (`get_cors_origins`)
  - GK-3: Token logging removed; `/verify-email` rate-limited
  - GK-4: `main.py` refactored to routers (73 lines) + `dependencies.py` + `fallback_questions.py`
  - GK-5: Semantic `{error:{code,message}}` via `api_error()`
  - GK-6: structlog JSON + `X-Request-ID` correlation
  - GK-7: Redis required when `WEB_CONCURRENCY > 1`
  - GK-8: tenacity LLM retry + `LLM_API_KEY` startup validation
  - GK-9: timezone-aware datetimes, session index, column length migrations
  - GK-10: Chroma health check, FastEmbed warmup, input sanitization
  - GK-11: `ALLOW_FALLBACK_QUESTIONS` feature flag
  - **pytest: 61 passed**
- GK-1 / GP-1 / GP-2 / G2-0
- G1-1: Delete LangGraph Stubs + Fix README
- G1-2: Expand RAG Corpus + Wire Ingest into Deployment
- G1-3: Sentry Observability Integration
- G1-4: LICENSE + SECURITY.md + README Rewrite
- G1-5: Landing Page Copy + pyqs.json vs pyproject.toml Sync

---

## Architecture Notes (Critical — Don't Forget)

### Next.js 16 Specifics
- File convention: `proxy.ts` (NOT `middleware.ts`) — export `function proxy(request: NextRequest)`
- `useSearchParams()` must be inside `<Suspense>` or production build fails
- Docs are in `node_modules/next/dist/docs/` — always check before assuming API shape

### Proxy Architecture
```
Browser → Vercel /api/* → Railway backend
```
- Browser **never** talks directly to Railway → Railway CORS settings are irrelevant for production
- `set-cookie` must NOT be in `HOP_BY_HOP_HEADERS` in the proxy route
- `BACKEND_API_URL` env var must be set in Vercel dashboard

### Design Tokens (Tailwind v4, `frontend/styles/tokens.css`)
- `text-accent` / `bg-accent` = violet (#8B5CF6) — AI Tutor theme
- `text-accent-practice` / `bg-accent-practice` = amber (#F59E0B) — Practice Arena
- `text-accent-mock` / `bg-accent-mock` = rose/pink (#F43F71) — Mock Tests
- `text-accent-progress` / `bg-accent-progress` = emerald (#10B981) — Progress
- `text-primary` = cyan (#00D4FF) — primary brand

### Auth Flow
- Login → backend sets httpOnly `access_token` cookie
- `proxy.ts` guards: `/dashboard`, `/tutor`, `/practice`, `/mock-tests`, `/progress`, `/error-log`
- Unauthenticated → redirect to `/login`; Authenticated on auth routes → redirect to `/dashboard`

---

## Environment Variables Needed

### Vercel (Frontend)
```
BACKEND_API_URL=https://<your-railway-url>
```

### Railway (Backend)
```
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
LLM_API_KEY=<your-llm-provider-key>
BACKEND_CORS_ORIGINS=https://<your-vercel-url>
ENVIRONMENT=production
REDIS_URL=redis://...   (optional, falls back to in-memory)
```

---

## Next Sprint

This is the full agenda for the next working session. Work through these in order:

### 1. Frontend Audit
- [x] Global error boundary (`app/error.tsx`, `app/global-error.tsx`)
- [x] Loading states for all async pages (`app/*/loading.tsx`)
- [ ] Form validation (signup/login — client + server side)
- [ ] Empty/error states on all data-fetching pages
- [ ] Mobile responsiveness check (sidebar collapse, tutor chat, mock test layout)
- [ ] Accessibility basics (aria labels, focus rings, keyboard nav)
- [ ] `<head>` metadata (`app/layout.tsx` — title, description, og:image)
- [x] 404 page (`app/not-found.tsx`)

### 2. Backend Audit
- [x] Global exception handler (FastAPI `@app.exception_handler`)
- [x] Request timeout middleware (kill hung LLM calls after N seconds)
- [ ] Consistent API error response shape `{ error: string, code: string }`
- [ ] Auth edge cases: expired token, malformed token, missing cookie
- [x] Rate limiting review (slowapi config — limits per endpoint)
- [ ] DB connection pool tuning (`pool_size`, `max_overflow`, `pool_timeout`)
- [x] Health check endpoint `GET /health` returning DB + Redis + LLM status (partial)
- [ ] Startup validation (fail fast if `DATABASE_URL` / `JWT_SECRET` missing)
- [ ] Structured logging (structlog already in requirements — wire it up properly)

### 3. Integration Audit
- [ ] Proxy error passthrough (5xx from Railway → meaningful message to user)
- [ ] SSE connection drop recovery (frontend reconnect logic in tutor page)
- [ ] Cookie forwarding end-to-end test (login → dashboard → API call)
- [ ] CORS-free validation (confirm no `Access-Control` headers needed on Railway)
- [ ] API response shape consistency across all endpoints

### 4. Load & Resilience
- [ ] LLM call timeout + retry (tenacity already in requirements — use it)
- [ ] ChromaDB query timeout guard
- [ ] Redis fallback already in place — verify it degrades gracefully
- [ ] Async DB sessions (confirm all endpoints use `async with` session)
- [ ] Background task queue for heavy operations (mock test scoring)

### 5. Deployment Packaging
- [ ] `docker-compose.yml` for local dev (postgres + redis + backend + frontend)
- [ ] `.env.example` complete for both frontend and backend
- [ ] Railway `railway.toml` health check config
- [ ] Vercel `vercel.json` with correct `rewrites` and `headers`
- [ ] Alembic migration check on Railway startup (already scripted — verify)
- [ ] Zero-downtime deploy checklist in `DEPLOY.md`
- [ ] GitHub Actions CI green on `main` before deploying

---

## Branch Strategy
- `main` — production-ready, always deployable
- Working branch this session: `claude/pc-file-access-mnxju`
- All work should be committed with clear messages and pushed

---

## How to Re-deploy After Audit

### Railway
1. Create new project → Deploy from GitHub → select `KafKafrnZ/AI-Tutor`
2. Set Root Directory: `backend`
3. Add all env vars from the list above
4. Deploy — Railway uses `Dockerfile` in `backend/`

### Vercel
1. Import `KafKafrnZ/AI-Tutor` from GitHub
2. Set Framework: Next.js, Root Directory: `frontend`
3. Add `BACKEND_API_URL` pointing to Railway URL
4. Deploy

---

## Files Worth Knowing

| Path | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app, middleware, route registration |
| `backend/app/core/config.py` | All env var settings (Pydantic BaseSettings) |
| `backend/requirements.txt` | Pinned deps — be careful editing, conflicts are easy |
| `frontend/proxy.ts` | Auth middleware (Next.js 16 file convention) |
| `frontend/app/api/[...path]/route.ts` | Reverse proxy to Railway |
| `frontend/styles/tokens.css` | Design token definitions |
| `frontend/components/layout/` | PageShell, PageHeader, GlassCard, Sidebar |
| `frontend/lib/api.ts` | `API_URL` constant and fetch helpers |
