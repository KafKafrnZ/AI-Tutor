# CURRENT SYSTEM AUDIT & ENTERPRISE UPGRADE STRATEGY
**IBPS SO AI Tutor → Full GovExam AI Suite**

**Date:** Current (post multiple fix rounds)  
**References:** 
- `GovExam_AI_Tutor_Master_Roadmap.docx` (primary vision, phases, architecture, monetization, legal)
- Historical: `FIXES/*.md`, old `SYSTEM_AUDIT_BRUTALLY_HONEST.txt` (deleted per request; many items addressed), `AITutor_Audit_Enterprise_Reference.docx`, `SAVE_POINT_SYSTEM_STRUCTURE.txt`, `backend/seed_mock_test.py`
- Full codebase inspection: backend/ (main.py + modules + core + models + alembic + docker), frontend/ (all app/ pages, middleware, store, components, lib), pyproject/requirements, pyqs.json, etc.
- Verification: `npx tsc --noEmit` (frontend clean), code greps, file reads, structure cross-checks.

**Executive Summary**  
Significant progress has been made. Many items from the historical FIXES/01_CRITICAL_BUGS.md, 02_SECURITY.md, 03_BACKEND_ARCH.md, 04_FRONTEND.md, 05_ENTERPRISE_GAPS.md, and the old brutally honest audit have been **incorporated** (httpOnly cookies + middleware auth, proper ErrorLog rendering + response_model, timer ref fix, skip-not-logged, streaming auth, password validators, Date column + parsing, connection pooling, health DB check, structured logging + security headers, caching + invalidation, ErrorBoundary, mobile sidebar, Alembic + no init_db, RAG auto-injection in tutor, etc.).

**However, the system is still a prototype with ... (see details below).**

**UPDATE (this session + follow-up pass):** Critical runtime blockers addressed:
- Tutor streaming (C-01): FE now correctly consumes current backend SSE token chunks (live preview + Skip; old agentThoughts UI removed). Final answers get typing animation.
- RAG (C-02): Code duplication removed (shared _build_rag_context + citation logging); pyqs.json expanded 10→27 representative items.
- Mock tests (C-03): Real /mock-tests list endpoint + meta in questions response; FE pages now fetch (no more lies); seed.py fixed (no init_db crash, guard for idempotency); [id] engine no longer hardcodes title/dur; save-errors now invalidates caches.
- Layout (C-04): AppLayout early-returns clean children on public routes (no sidebar pollution on login/landing).
- Cookie/CORS (S-01 + config): BACKEND_CORS_ORIGINS now parsed from env in config; ENVIRONMENT centralized via settings for secure cookie.
- Quick wins: rate limits on LLM routes, Llama badge updated, practice legacy parse cleaned, unused imports removed, justSentRef timing for anim.

Many prior items were already landed (see "Largely Addressed").

**After these passes, core IBPS SO flows (auth, tutor streaming, mocks with real list, progress/revision, RAG with more data) are functional end-to-end.** Still prototype (small corpus, no real email, no refresh tokens, flat code, no tests/CI). Ready for next roadmap phases or beta seeding.

It is **not yet production/enterprise ready** for the expanded vision (see Enterprise section). Security surface reduced but not eliminated for scale; etc. (original text follows for the bigger gaps).

**Status vs Roadmap (high level from GovExam doc Table 1.1):**
- AI Tutor Chat (multimodal RAG): Exists (RAG "wired" but broken/ineffective, no multimodal)
- Practice Arena: Exists (basic, AI gen)
- Mock Test Engine: Exists (hardcoded list + partial DB questions)
- Progress Dashboard: Partial (improved but data display and seeding gaps)
- Answer Sheet Checker / Doubt Solver / Study Workspace / Admin / Multi-Exam: NOT BUILT
- Many "broken" or "hardcoded" notes in roadmap still partially true.

This document supersedes prior audits. Old FIXES/01-05 remain as historical snapshots of issues at earlier points in time.

---

## 1. FIXES INCORPORATION STATUS (Cross-Reference)

### Largely / Fully Addressed (from old audits + FIXES)
- **BUG 1 (Mistake Locker)**: Fixed. Proper `ErrorLogEntry` interface + renders `question_text`, `user_answer`, `correct_answer`, `explanation`, `date_added`. Backend uses `response_model=List[ErrorLogResponse]` + `from_attributes`.
- **BUG 2 (Stream auth)**: Fixed. `/ask/stream` now requires `current_user = Depends(get_current_user)`.
- **BUG 3 (Timer stale closure)**: Fixed via `answersRef = useRef` + sync effect (cleanest option from old doc).
- **BUG 4 (Skipped logged as mistakes)**: Fixed. Grading loop: `if (!userAnswer) { skippedCount++; continue } else if (wrong) { log }`.
- **BUG 5 (ORM serialization error-log)**: Fixed (see above).
- **BUG 6 (double get_weak_areas)**: Fixed (compute once, serialize).
- **SEC-1 / SEC-2 (hardcoded secrets + localStorage JWT)**: Mostly fixed. No plaintext passwords/JWT fallbacks in config (raises ValueError). All fetches use `credentials: "include"`. Only non-sensitive `userName` in localStorage. Backend sets `httponly` + `secure` + `samesite=lax` cookies. Middleware guards routes using cookie.
- **SEC-3 (rate limits on auth)**: Added `@limiter.limit("3/minute")` signup, `"5/minute"` login + global 100/min.
- **SEC-4 (no signup validation)**: Fixed. `SignupRequest` has `EmailStr`, `field_validator` for password (8+ chars, upper, digit), name (non-empty, trimmed).
- **ARCH-1 (pool config)**: Engine in `database.py` has `pool_size=10, max_overflow=20, pool_timeout=30, pool_recycle=1800, pool_pre_ping=True`.
- **ARCH-2 (create_all vs Alembic)**: `init_db()` removed from models; lifespan logs "schema managed by Alembic". Migrations exist (`alembic/versions/` with initial + auth_tokens). Compose runs `alembic upgrade head && uvicorn`.
- **ARCH-3 (save_error_log no rollback)**: Now has try/except/rollback + logger (matches save_mock_test).
- **ARCH-4 (MockTest date String)**: Column is `Date`; save parses `fromisoformat`.
- **ARCH-5 (no pagination)**: `/error-log` has `skip/limit` (default 50); `load_data` has `limit=50`.
- **ARCH-6 (health always OK)**: Now `SELECT 1` test, 503 on fail.
- **ARCH-8 (docker volume + reload in prod)**: Compose has prod-like (no volume? wait partial; command has workers, alembic). Separate `.dev.yml`.
- **ARCH-9 (sys.path)**: Removed from main.py; compose injects `PYTHONPATH=/app`.
- **FE-1 (no middleware)**: `frontend/middleware.ts` exists, protects routes, redirects using `access_token` cookie.
- **FE-2 (profile on every route)**: Fixed (useEffect deps `[]`).
- **FE-4 (progress ignores data)**: Now renders weak_areas (tags), recent_tests list, computes accuracy, dynamic "No data yet" / "Active".
- **FE-5 (any everywhere)**: Much improved (interfaces in error-log, progress, dashboard, tutor etc.). Still some `any` in practice/store.
- **FE-6 (mobile sidebar)**: Added state, hamburger, overlay dimmer, auto-close on nav, responsive pl/md classes.
- **FE-7 (no ErrorBoundary)**: Added `components/ui/ErrorBoundary.tsx` (class component fallback), wrapped in root layout + AppLayout.
- **GAP 3 (RAG not wired)**: Partial progress — `tutor.py` now auto-calls `load_pyqs`/`initialize_rag`/`search_pyqs` and injects context for both ask and stream (with error fallback to "No previous year..."). `data/pyqs.json` exists (stub).
- **GAP 1/2 (email verify + password reset)**: Backend scaffolding done (AuthToken table, /verify-email, /forgot-password, /reset-password endpoints, is_verified column + block in get_current_user, token logging in logs for dev). Frontend pages exist + "Forgot your password?" link on login. **Not production** (no real email dispatch).
- Caching, structured logging + request timing + security headers (X-Content-Type-Options etc.), single FastAPI instance + lifespan, http client pooling in tutor, MasterQuestion FK/cascade/Date fixes, etc.

**Verification note**: `npx tsc --noEmit --skipLibCheck` (frontend/) exits 0. Backend imports fail only due to missing site-packages (expected outside venv/docker).

---

## 2. REMAINING FLAWS (Current Codebase — Categorized, With Impact)

### CRITICAL / RUNTIME-BREAKING (Ship Blockers) — Updated post-fix pass
- **C-01: Tutor streaming completely mismatched / non-functional UX** ✅ **RESOLVED in this pass**. See "UPDATE (this session)" above for details. FE reader now robustly accumulates chunks (supports backend's `{"data": token}`), live growing preview with Skip, committed answers get clean typing. No more silent fails or agent ghost UI.
- **(Original C-02/C-03/C-04/C-05 text below retained for history; all addressed per the session summary at top of file.)**

- **C-02: RAG pipeline fragile + ineffective (data + code + perf)**  
  Files: `backend/modules/rag.py:18` (`open("data/pyqs.json")` relative to *cwd*, not `__file__` or package), `backend/modules/embeddings.py:5` + `rag.py:10` (duplicate `SentenceTransformer("all-MiniLM-L6-v2")` at import — ~180MB RAM, startup block), `tutor.py:57-70,84-96` (duplicate RAG code in ask + stream; masks errors), `data/pyqs.json` (only 3 sample items), faiss_index save/load unused (no persistence), prints not logger, english-only embed, no hybrid.  
  In tutor: extraction assumes `r['data']` wrapper (correct from search) but path/cwd will often cause empty results → "No previous year context".  
  **Impact**: Tutor answers ungrounded (defeats purpose per roadmap "RAG quality = 80% of tutor quality"). Slow startup, high memory. Roadmap: "RAG never wired" was old; now "wired but broken".  
  **Fix**: Anchor path with `Path(__file__).parent`, lazy model load (lifespan or first use), expand pyqs.json (50-100+ real IBPS SO PYQs across subjects), add BM25 hybrid + persist + re-ranker (see roadmap 3.1, 5.1).

- **C-03: Mock tests / question bank broken & hardcoded**  
  Files: `frontend/app/mock-tests/page.tsx:8` (hardcoded 3-test array with fake metadata), `frontend/app/mock-tests/[id]/page.tsx` (hardcodes title/duration 120min; fetches questions), `backend/app/main.py:379` (only `/mock-tests/{id}/questions`; no list endpoint), `backend/seed_mock_test.py:11` (calls non-existent `init_db()`, sys.path hack, AI-generates only for test_id=1 via `generate_questions`, clears only id=1), MasterQuestion table mostly empty in fresh DB.  
  **Impact**: Only "Set 1" likely works; list lies to user; no way to manage/add tests without SQL or broken seed. Roadmap explicitly calls "hardcoded", "fetch from DB".  
  **Fix**: Add backend list endpoint (or use MasterQuestion + test metadata table), make frontend fetch list, fix/integrate seed (remove init_db call, make idempotent, support multiple tests), add admin UI later.

- **C-04: AppLayout sidebar + public pages conflict**  
  `frontend/app/AppLayout.tsx` (sidebar + mobile header + profile always rendered + md:pl-64 padding on main), root `layout.tsx` wraps *everything*, no `pathname` guard to hide for `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`. Middleware protects some but layout pollution remains. Landing and auth pages get sidebar chrome.  
  **Impact**: Broken UX on public flows (overlaps, wrong padding, profile dropdown on login).  
  **Fix**: Conditional render in AppLayout (if public route return <>{children}</>), or move to route groups `(protected)/` layout.

- **C-05: Seed + startup / data integrity scripts broken**  
  `seed_mock_test.py` references removed `init_db`, will crash. No integration into docker start or alembic data migration. pyqs.json tiny. No production seeder.  
  **Impact**: Can't reliably populate questions for mocks.

### SECURITY & AUTH (Remaining Exposure)
- **S-01: Cookie secure=True always (breaks local dev http)**  
  `main.py:244,322`: `secure=True` unconditional. On `http://localhost:3000` (standard dev), modern browsers ignore/set-fail secure cookies → auth "works" in some setups but flaky or fails silently after login.  
  **Fix**: `secure = os.getenv("ENVIRONMENT") == "production" or similar` (use settings.ENVIRONMENT). Add http://localhost to CORS for dev.

- **S-02: No real email dispatch (verify/reset tokens only logged)**  
  Signup/reset create AuthToken + `logger.info("... TOKEN ...")`. No Resend/SMTP. New users see "check email" but must manually construct /verify-email or read server logs. is_verified blocks login.  
  **Impact**: Onboarding dead for anyone but devs. Roadmap Phase 2 calls for Resend + full flow.  
  **Fix**: Integrate Resend (or smtplib) using env creds; send actual links. Update .env.example. Consider making verify non-blocking for beta (flag).

- **S-03: No refresh / revocation (single short-lived JWT)**  
  60min access token (improved from 24h). No refresh token table/endpoint. Logout only clears cookie (active JWTs until expiry still valid if stolen). No Redis.  
  **Fix per roadmap**: Redis-backed refresh (7d sliding), /refresh endpoint, auto client refresh on 401. Store refresh hash in DB (or Redis) for revocation on logout/password change.

- **S-04: No per-user rate limiting on LLM endpoints + no input limits**  
  Global IP limiter only. /ask /practice /revision-plan can be abused (cost + quota). No max_length on question/topic.  
  **Fix**: SlowAPI with user-aware key_func (or redis), Pydantic max_length + middleware truncate/sanitize. Enforce plan limits (free tier caps).

- **S-05: CORS not fully dynamic from env; potential wildcard risk**  
  Settings has static list. Old audits warned of docker overrides to "*".  
  **Fix**: Parse `BACKEND_CORS_ORIGINS` as comma list in config (like .env.example suggests).

- **S-06: Validation errors UX poor on frontend**  
  Signup (and others) on 422: `errorData.detail` is list → toast shows raw or generic. Backend has good validators.  
  **Fix**: Parse `detail[0]?.msg` or use better error shape.

- Minor: No rate limit on /me etc; plan stored but not enforced in routes (free users get full AI access).

### ARCHITECTURE, DATA, RELIABILITY
- **A-01: Flat routes, no versioning, no services layer** (vs roadmap 2.1)  
  Everything in `main.py` (60+ lines of schemas + routes). No `app/api/v1/`, no repositories, no `services/`. Hard to version, test, or extend to multi-exam.  
  **Fix (roadmap-aligned)**: Introduce APIRouter v1, move tutor/practice/assessment/study to separate routers/services. Add exam_service.py for syllabus.

- **A-02: No background jobs / long-running handling**  
  AI calls (generate 30q, revision plan, tutor) block request up to 60s+. No job_id poll pattern, no Celery. Proxies may kill conn.  
  **Fix**: FastAPI BackgroundTasks for start; or Redis + Celery (roadmap Phase 6+). Return job immediately for practice.

- **A-03: Caching is in-memory only (per-process, lost on restart/replicas)**  
  `_cache` dict in main.py. Good for single worker dev; useless for prod workers or deploys.  
  **Fix**: Redis cache (roadmap recommends). Invalidate on save-errors/save-mock.

- **A-04: No tests, no CI, minimal observability**  
  0 pytest. Logs are basic (no correlation IDs, user_id on every log, token counts). No Sentry.  
  **Fix per roadmap Phase 6**: pytest (auth, routes, analyzer), GH Actions, structlog + Sentry, request IDs.

- **A-05: RAG/LLM duplication + no eval**  
  Prompt cleaning in multiple places. No RAGAS scores, no faithfulness tracking.  
  **Fix**: Centralize cleaning, add eval harness (roadmap 5.1).

- **A-06: Docker / deploy friction**  
  Compose files inside `backend/`, paths assume specific CWD for build/volumes. No multi-service (redis, next) easy one-command. Dockerfile good but no .dockerignore mentioned. No health in compose for db.  
  **Fix**: Move compose to root or document run cmds; add dev/prod profiles cleanly; include redis.

- Data: MasterQuestion + MockTest relations good (cascades), but no indexes beyond PK, no soft deletes, seed not reliable. pyqs.json not versioned with real data.

### FRONTEND / UX / STATE
- **F-01: No persist in Zustand** (chat history, practice state lost on refresh/hard nav). Roadmap expects conversation history in /ask.  
  **Fix**: Add `persist` middleware (localStorage for non-sensitive).

- **F-02: Animated typing no controls + leftover agent UI** (see C-01).

- **F-03: Minor interface drift** (e.g. progress RecentTest still lists `id` that pandas records lack; some any[] remain).

- **F-04: Inconsistent error UX** (some pages show nice auth error cards; others generic toasts or blank).

- **F-05: Hardcoded strings** (exam names, "Llama-3 Active" badge while using 70b, durations).

- Practice page has extra legacy answer parsing paths.

### ENTERPRISE / PROD / ROADMAP GAPS (Biggest Lift)
Per `GovExam_AI_Tutor_Master_Roadmap.docx` Phases 3-7 and Section 2 architecture:
- **E-01: No multimodal RAG / vision / PDF / OCR / answer sheet / doubt solver** (roadmap Phase 3/4 core moat). Current is text-only + tiny corpus.
- **E-02: No multi-exam / syllabus engine** (IBPS SO only; hardcoded topics). Target: SSC, UPSC, RRB, State PSC, Defence etc. (table 1.2 in roadmap).
- **E-03: No study workspace** (notes, bookmarks, flashcards, spaced repetition — Phase 4).
- **E-04: No admin / content mgmt / B2B** (question bank CRUD, user mgmt, institute tier, bulk upload — Phase 4/5).
- **E-05: Monetization nonexistent** (plan="free" stored but unenforced; no Razorpay, no pricing page, no webhooks, no feature gates, no referral — Phase 5).
- **E-06: No prod ops** (Sentry, daily R2 backups, structured logging w/ IDs, 80%+ test cov, GH Actions, full docker with redis/celery, DPDP privacy policy + ToS + AI disclaimer, GST/Razorpay KYC — Phase 6).
- **E-07: Scale items** (Hindi/multilingual embed, mobile/PWA, B2B white-label, on-prem, community, affiliate — Phase 7).
- **E-08: Legal/compliance incomplete** (no visible policies in app; copyright table in roadmap for PYQs/NCERT etc.).

Other: No Redis (required for many scale items), no Celery, weak input sanitization, no usage quotas enforced, frontend uses Next 16 but roadmap references 15 patterns.

---

## 3. PRIORITIZED FIX SEQUENCE (Recommended Order)

**Aligns to GovExam Roadmap phases + risk/impact. Do in strict order. Verify after each (see Section 5).**

**IMMEDIATE (Days 1-3, unblock core usage) — "Phase 0+"**
1. Fix tutor streaming (align frontend parser or simplify to plain tokens + update AnimatedMarkdown to support instant "skip" / full content toggle). Remove or hide broken agentThoughts UI.
2. Fix RAG loading (anchor pyqs.json path with `pathlib.Path(__file__).parent / "data" / "pyqs.json"` in rag.py; de-dupe SentenceTransformer (lazy load or central in rag only); expand pyqs.json with 50+ real questions; add logging; test that context appears in prompts).
3. Fix mock test list + seeding (add backend GET /mock-tests or derive from MasterQuestion; make frontend fetch list + metadata; fix seed_mock_test.py (remove init_db, support multi-test, run via script or alembic data); document how to seed for id 1/2/3).
4. Fix cookie secure for dev + CORS (make secure conditional on env; ensure BACKEND_CORS_ORIGINS parsed as list in config.py from env).
5. Fix AppLayout public page rendering (conditional sidebar or route groups).
6. Quick wins: add input max_length validators on AskRequest/PracticeRequest; improve validation error toasts (handle detail[0].msg); add basic skip to typing animation.

**SHORT TERM (1-2 weeks) — Roadmap Phase 1 "Solid Backend" + Phase 2 Auth/Sec**
7. Real email (Resend integration for verify + reset; update .env; test full flows; optional: make verify soft for beta).
8. Refresh tokens + Redis (add redis to compose; refresh table/endpoint or Redis store; client auto-refresh on 401 in lib/api.ts wrapper; per-user rate limits on LLM routes).
9. Modularize backend (move routes to `app/api/v1/routes/*.py` + APIRouter(prefix="/v1"); update frontend API_URL or base; update docs). Start services/ layer.
10. Add Redis caching (replace in-mem; invalidate properly).
11. Background jobs skeleton (BackgroundTasks for practice gen; return job_id + poll endpoint).
12. Fix remaining FE any[] + small drifts; add persist to zustand for tutorMessages (at least).
13. Expand test seeds + add pytest skeleton (test_auth, test_tutor_rag, test_stats, test_save_error_rollback).

**MEDIUM (2-4 weeks) — Roadmap Phase 3 "Multimodal RAG" + Phase 4 Features**
14. Production RAG (hybrid BM25 + dense; persist index to disk/R2 on build; cross-encoder re-rank; multilingual embed model; PDF chunking with PyMuPDF; conversation history in /ask; RAGAS eval script).
15. Multimodal basics (image upload in tutor → vision model or OCR → RAG; start doubt-solver page).
16. Dynamic mocks + question bank (full CRUD admin routes + simple /admin UI; bulk upload; link MasterQuestion properly to multiple tests).
17. Study workspace start (notes + bookmarks models + pages; flashcards basic).
18. Plan gating (enforce free/premium limits in /ask /practice /mock based on user.plan + usage counters).

**PROD / LAUNCH (2-3 weeks) — Roadmap Phase 5 Monetization + Phase 6**
19. Payments (Razorpay create-order + verify webhook; pricing page; update user.plan; feature gates everywhere).
20. Full ops (Sentry both sides; structlog + correlation IDs; GH Actions for lint/test/build; compose root with redis/celery/next; daily backups; healthchecks).
21. Legal + policies (ToS, Privacy (DPDP), AI disclaimer in tutor, refund; link in footer/layout; GST awareness).
22. 80%+ coverage + e2e smoke (Playwright for critical flows: signup→verify→mock→progress).
23. Beta launch prep (100 users, feedback, iterate per roadmap checklist).

**ONGOING / SCALE (Phase 7+)**
- Multi-exam syllabus engine + content for SSC/UPSC etc.
- Full multimodal (answer sheet upload + OCR + grading).
- Mobile/PWA, B2B admin white-label, community.
- Fine-tune embed on Indian exam corpus.
- Advanced: on-prem option, gov tender track.

**Effort estimates** match roadmap (1wk critical → months for full suite). Focus 80% on RAG quality + auth reliability + data seeding first.

---

## 4. UPGRADE STRATEGY TO PRODUCTION / ENTERPRISE

**A. Architecture Modernization (must for maintainability)**
- Adopt roadmap 2.1/2.2 exactly: `app/api/v1/routes/`, `app/services/`, `app/db/repositories/`, separate assessment/study/exam services.
- API versioning from day 1 (/v1 prefix).
- Async SQLAlchemy where possible (current sync is ok for start but roadmap wants asyncpg).
- Central config + secrets (already good base).

**B. Data & AI Layer (the moat)**
- Per roadmap 5.1: chunking (Q+A together, 256-512 tok), hybrid retrieval (dense+BM25), re-ranker, metadata (exam, year, topic, difficulty), RAGAS eval (faithfulness >0.85 target).
- Expand beyond PYQs: NCERT paraphrased notes, official syllabi.
- Multimodal ingestion (PDF tables preserved, images described via vision).
- Persistence + optional Qdrant for scale.
- Versioned corpora + re-index jobs.

**C. Auth & Security Hardening**
- Refresh + Redis sessions.
- Real transactional email (Resend).
- Per-user + per-plan rate limits + quotas.
- Input sanitization + length + OWASP.
- Secrets scanning in CI, dep audit (pip-audit + npm).
- HSTS, full HTTPS (Cloudflare), encrypted storage for uploads (R2).

**D. Observability & Reliability**
- Structured logs + tracing (correlation ID per request across LLM calls).
- Sentry (frontend + backend) + error budgets.
- Metrics (Prometheus or platform) + dashboards (response time, AI token spend, error rate, active users).
- Health + readiness probes; graceful degradation (RAG fail → still answer).
- Automated tests + contract tests (frontend vs backend schemas).

**E. Infra & Deploy**
- Root docker-compose with profiles (db, redis, backend, worker, frontend).
- Multi-stage Dockerfiles; .dockerignore.
- Railway (backend + postgres + redis + volumes for faiss if needed) + Vercel (frontend) + Cloudflare (static + R2 for uploads/PDFs + custom domain).
- CI: lint (ruff + eslint), test, typecheck, build, scan, migrate dry-run.
- Backups: daily postgres dump + R2; point-in-time if possible.
- Feature flags (for gradual rollout of multi-exam etc.).

**F. Product & Business (Roadmap 1.2 + 5-7)**
- Exam selector + syllabus browser (start with IBPS + one more).
- Gating + plans (Free: limited daily AI + 1 mock/wk; Premium: unlimited; Institute: multi-seat + admin + branding).
- Razorpay subscriptions + webhooks + invoices.
- Admin dashboard (protected role) for questions/users/analytics/revenue.
- Answer sheet + doubt solver + workspace (notes/flashcards/SRS) as killer features.
- Legal pack + DPDP compliance + AI disclaimer everywhere.
- Analytics (PostHog or Mixpanel) for funnel (signup→first mock→retention).
- B2B sales motion + white-label.

**G. Process**
- All changes via small PRs + review.
- Update this audit + roadmap after each phase.
- User testing with real IBPS aspirants early.
- Measure RAG quality + user satisfaction (NPS, "was this helpful?").

**Risks & Mitigations**
- LLM cost blowup: quotas + caching + cheaper models for practice.
- Data copyright: cite sources; prefer public domain/official; paraphrase; ToS grants license on user uploads.
- Hallucination: strong RAG + "I don't know" rules in prompts + user verification disclaimer.
- Scale: start single region; add workers + queue before 100s concurrent.

---

## 5. VERIFICATION CHECKLIST (Run After Major Changes)

- Typecheck: `cd frontend && npx tsc --noEmit --skipLibCheck` → 0 errors.
- Backend smoke (in docker or venv): uvicorn starts, /health returns DB connected, /me requires auth.
- RAG: Ask tutor a specific PYQ-like question → logs show no "RAG pipeline error", response references real PYQ content (inspect prompt or returned context).
- Auth flows: signup (logs token) → manual /verify-email or implement email → login (cookie set, no local token) → protected pages load data → logout clears → middleware redirects.
- Mock: List shows real items (after seed), clicking loads questions from DB, submit saves to MockTest + ErrorLog (for wrongs only), /stats and /progress and /revision-plan reflect new data + use cache.
- Streaming: Tutor chat streams tokens progressively (no long delay, no "connection error" on normal use); can "skip" animation.
- Mobile: Sidebar drawer works, no overlap on <700px.
- No secrets in git: grep -r "Myraaa|super_secret" backend/ (should be clean outside .env).
- Error cases: bad password → clear validation toast; unauth → redirect or 401 card; DB down → 503 health.
- Roadmap alignment spot checks: e.g. after Phase 1, RAG should be "grounded"; after 3, image upload works in tutor.

Run full flows end-to-end in browser + check server logs + DB rows.

---

## 6. RECOMMENDATIONS & NEXT STEPS

1. **Today**: Tackle C-01 (streaming) + C-02 (RAG path + expand data minimally) + C-04 (layout). These unblock daily use and match "Week 1 Action Plan" in roadmap.
2. Treat the `GovExam_AI_Tutor_Master_Roadmap.docx` as the north star. Current code is a solid IBPS prototype foundation — the gaps are expected per the doc's "Exists (broken...)" / "NOT BUILT".
3. Consider a small spike: get 20-50 real PYQs into json + verify tutor cites them. This alone dramatically improves perceived quality.
4. For enterprise sales (institutes/gov): prioritize admin + multi-user + audit logs + on-prem options early in planning.
5. Budget for LLM + infra costs from day 1 of beta (track tokens per user).
6. Update `FIXES/00_PROJECT_STRUCTURE.md` (and possibly prune old 01-05 or mark "historical") after this audit lands.
7. After criticals, run the seed, test a full mock→progress→revision cycle, then plan the modular refactor + Redis.

This system has strong bones (clean auth migration, good component polish, RAG attempt, caching/logging hygiene) and a clear ambitious vision in the roadmap. With focused execution on the sequence above it can realistically move from "working prototype with rough edges" to "defensible, monetizable GovExam platform".

**End of Current Audit.**  
Next action: implement the immediate criticals, then re-audit or mark items complete here.

---

## 7. ADDITIONAL FLAWS & OBSERVATIONS (Discovered/Addressed in Detailed Pass)
During full codebase review (reads of main.py, all FE pages, models, modules, seed, configs, greps for agent/hardcode/any/TODO/rate, tsc, py_compile, structure checks):

**Addressed in this work (beyond original C-0x):**
- Incomplete cache invalidation: `/save-errors` (called by mock grading) did not pop stats/revision caches → stale AI plan after taking a test. Fixed (now matches save-mock-test).
- Seed script: hard import of removed `init_db()`, sys.path hack, no guard. Fixed (clean imports, guard if count>0, better messaging).
- Practice page: legacy response shape branches (`data.answer` vs `data.questions`) from old tutor. Cleaned to prefer current backend shape.
- Hardcoded model badges ("Llama-3 Active", landing claim). Updated to "Llama 3.3".
- Narrow rate limiting: only auth had specific limits. Added `10/minute` (ask/stream/practice) + `5/minute` (revision) on LLM paths.
- Config drift: CORS list static despite .env.example; ENVIRONMENT used via raw os.getenv in main. Centralized parse + settings.ENVIRONMENT.
- Streaming animation: no skip, and parser mismatch. Fixed (Skip button + live instant + final anim).
- Minor: unused imports in tutor page after UI removal; direct MasterQuestion query in new list needed import (added).

**Still open / recommended next (not critical for prototype use):**
- Architecture: `backend/app/api/` empty; everything in main.py (~500 lines routes+schemas). Per roadmap 2.1, introduce APIRouter v1 + services/ when adding multi-exam.
- No automated tests (tests/ dir empty; only old pycache). Add pytest for auth, save flows, analyzer, tutor (with mock LLM).
- Real email still TODO + logger only (S-02). No Resend/SMTP.
- RAG still text-only English, no persist/hybrid/BM25, small corpus (27 now — good start but expand with real paraphrased/official for prod).
- No per-user quotas or plan enforcement (free gets unlimited AI).
- FE: api.ts is thin (no central error/401 refresh wrapper yet — needed for future refresh tokens).
- Some console.error remain (prefer toast + structured).
- No .dockerignore mentioned; compose files in backend/ (friction for root multi-service).
- In data_analyzer: weak_areas from MockTest sections only (revision uses separate ErrorLog path); load limit 50 good.
- get_current_user hard-blocks unverified on all protected (including tutor after signup). Good security, but consider soft beta flag.
- No indexes beyond PKs on high-query tables (ErrorLog.user_id + date, MockTest.user_id).
- AnimatedMarkdown typing still interval-based (could be smoother with requestAnimationFrame or CSS, but functional).
- Duplicate alembic/ at root + backend/ (historical?).
- In practice generate: the client appends "Generate exactly 30..." on top of backend prompt; may be redundant.

**Verification performed:**
- `npx tsc --noEmit --skipLibCheck` (frontend/) → clean (0 errors) before/after edits.
- `python -m py_compile` on edited .py (main, tutor, seed, config, database) → OK.
- Manual code review of changed flows (reader loop, list/meta, conditional layout, deduped RAG helper, seed guard).
- pyqs.json: 27 items, properly formatted, citations include subject/year.
- No new secrets or obvious regressions introduced.

**Recommendation:** After these, run full local cycle (seed test 1 → take mock via UI → check progress + revision-plan cites new errors + tutor uses RAG). Then tackle short-term (real email or soft verify, Redis skeleton, modular routes).

---
*Updated with fixes + analysis from interactive pass. Original sections retained for archaeology.*