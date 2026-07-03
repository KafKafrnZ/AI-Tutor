# Ascend AI — Fixes Playbook

_Last verified against `main` @ `dd02674` (PR #24, 2026-07-03)._

This is the single source of truth for what is still broken, what is already fixed, and how to tackle each item in order.

---

## 0. Fresh Setup (do this first)

Local copies were cleared. Re-clone and bootstrap:

```bash
# Remove any stale copies (safe to re-run)
rm -rf ~/projects/AI-Tutor ~/.gemini/history/ai-tutor ~/.gemini/tmp/ai-tutor

# Clone latest main
git clone https://github.com/KafKafrnZ/AI-Tutor.git ~/projects/AI-Tutor
cd ~/projects/AI-Tutor
git log -1 --oneline   # expect: dd02674 Merge pull request #24

# Backend
cp backend/.env.example backend/.env
pip install -r backend/requirements.txt -r backend/requirements-dev.txt
cd backend && alembic upgrade head && pytest tests/ -q

# Frontend
cd ../frontend
cp .env.example .env.local   # if present; else create with BACKEND_API_URL
npm ci && npm test && npm run build
```

**Or Docker (full stack):**

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
docker compose up --build
```

**Note:** A prior local branch `feat/3-tier-llm-and-gpu-rag` was **never pushed** to GitHub. That work is lost unless recovered from reflog. Related remote branch: `codex/production-rag-llm-hardening` — review before re-implementing.

---

## 1. What Is Already Done (do not re-fix)

| Area | Status |
|------|--------|
| Auth guard + `/explore` protected | `frontend/proxy.ts` |
| CSRF Origin/Referer validation | `backend/app/core/middleware.py` |
| JWT refresh token rotation | `backend/app/routers/auth.py` |
| Router-based FastAPI (`main.py` ~95 lines) | `backend/app/routers/*` |
| Structured errors `{error:{code,message}}` | `backend/app/core/error_handler.py` |
| structlog + `X-Request-ID` | `backend/app/main.py`, middleware |
| LLM retry on 429/5xx (tenacity) | `backend/app/core/llm_adapter.py` |
| Server-side mock grading (no answer leak) | `backend/app/routers/mock_tests.py` |
| XSS protection on tutor markdown | `rehype-sanitize` in `frontend/app/tutor/page.tsx` |
| SSE plain-token parser fix | `frontend/lib/sse.ts` |
| 200-question RAG corpus | `backend/data/pyqs.json` |
| 63 backend tests | `backend/tests/test_system.py` |
| docker-compose local stack | `docker-compose.yml` |
| Game UI pass (partial) | PR #24 — see F-14 for gaps |

---

## 2. Fix Priority Queue

Work top-to-bottom. Each item: **problem → files → steps → verify**.

### P0 — Critical

- **F-01** Email env vars: rename `SMTP_*` → `EMAIL_*` in `backend/.env.example` and `DEPLOY.md`
- **F-02** Railway ingest: add `data.ingest` to `backend/railway.toml` startCommand (match Dockerfile)
- **F-03** Preview auth: gate `NEXT_PUBLIC_PREVIEW_AUTH` to `NODE_ENV === 'development'` only

### P1 — High

- **F-04** Health: add LLM reachability to `backend/app/routers/health.py`
- **F-05** LLM fallback model tier in `llm_adapter.py` (see `codex/production-rag-llm-hardening`)
- **F-06** Sync SQLAlchemy: tune pool or migrate hot paths to async
- **F-07** Chroma query timeout in `backend/app/core/rag.py`

### P2 — Medium

- **F-08** Update stale `MEMORY.md`
- **F-09** Form validation (signup/login client + server)
- **F-10** Empty/error states on data-fetching pages
- **F-11** Replace raw Tailwind colors with design tokens
- **F-12** SSE mid-stream resume in `frontend/app/tutor/page.tsx`
- **F-13** Proxy 5xx passthrough in `frontend/app/api/[...path]/route.ts`
- **F-14** Complete game UI per `FRONTEND_GAME_UI_ORCHESTRATION.md`

### P3 — Low

- **F-15** Background mock scoring queue
- **F-16** Cookie E2E Playwright test
- **F-17** Archive `REFERENCE_PROMPTS.txt`
- **F-18** Mobile layout audit
- **F-19** Optional LLM verifier stream

See full step-by-step instructions in the local copy at `~/projects/AI-Tutor/FIXES.md`.

---

## 3. Sprint Plan

1. **Sprint 1:** F-01–F-04 + CI green + redeploy
2. **Sprint 2:** F-05, F-07, F-12, F-13
3. **Sprint 3:** F-08–F-11, F-14, F-18
4. **Sprint 4:** F-06, F-15, F-16, F-19

---

## 4. Verify Before Every PR

```bash
cd backend && pytest tests/ -v --tb=short
cd frontend && npm test && npm run lint && npm run build
```

---

_When fixed, move items to §1 and update MEMORY.md._
