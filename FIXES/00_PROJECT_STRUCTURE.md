# PROJECT FILE STRUCTURE (Historical Snapshot)
**Note: This file is retained for reference. Many items described here (agent.py, localStorage tokens, unwired RAG, etc.) have changed.**
**Primary current guide: `FIXES/00_CURRENT_AUDIT_AND_UPGRADE_STRATEGY.md` (full analysis, incorporated fixes list, remaining flaws, prioritized sequence, and enterprise upgrade strategy aligned to `GovExam_AI_Tutor_Master_Roadmap.docx`).**

Old FIXES/01-05 are historical snapshots of issues at earlier stages. Refer to the CURRENT_AUDIT for up-to-date status (many critical + security + arch items have been incorporated; see its Section 1).

## Full Tree (approximate at time of writing — check live with list_dir / explorer; ignore .venv, node_modules, .next, __pycache__)

```
ibps-so-ai/
│
├── FIXES/
│   ├── 00_PROJECT_STRUCTURE.md     ← This (historical) file
│   ├── 00_CURRENT_AUDIT_AND_UPGRADE_STRATEGY.md  ← **READ THIS FIRST** (current state + roadmap alignment)
│   ├── 01_CRITICAL_BUGS.md         ← Historical
│   ├── 02_SECURITY.md
│   ├── 03_BACKEND_ARCH.md
│   ├── 04_FRONTEND.md
│   └── 05_ENTERPRISE_GAPS.md
│
├── backend/
│   ├── app/
│   │   ├── main.py                 ← FastAPI (single instance + lifespan), routes, CORS, rate limiter, caching, logging, schemas, auth dep (httpOnly cookies)
│   │   ├── core/
│   │   │   ├── config.py           ← Settings (raises on missing JWT_SECRET / DATABASE_URL; CORS list — see current audit for env parsing)
│   │   │   ├── auth.py             ← bcrypt + JWT (60min)
│   │   │   └── error_handler.py
│   │   ├── models/
│   │   │   └── database.py         ← SQLAlchemy models (User with is_verified + plan, MockTest (Date), MasterQuestion (FK cascade), ErrorLog, AuthToken for verify/reset). Pool config, try/rollback helpers. No init_db/create_all.
│   │   └── schemas/
│   │       └── mock_test.py
│   │
│   ├── modules/
│   │   ├── tutor.py                ← AI (ask_tutor + stream + generate + evaluate). RAG auto-inject (with issues), shared httpx client, cloud (Groq 70b) + local fallback, prompt templates.
│   │   ├── data_analyzer.py        ← Pandas + AI revision plan (calls tutor run_cloud_model). load_data with limit.
│   │   ├── rag.py, embeddings.py, faiss_index.py  ← RAG (wired but fragile: relative path, duplicate model load at import, tiny data, no persist/hybrid).
│   │
│   ├── docker-compose.yml + .dev.yml + dockerfile
│   ├── alembic/ + alembic.ini      ← Migrations present (initial + auth tokens). Compose runs upgrade.
│   ├── seed_mock_test.py           ← AI-seeds MasterQuestion (currently broken: calls removed init_db()).
│   ├── data/pyqs.json              ← Stub (3 items) for RAG.
│   └── .env / .env.example
│
└── frontend/
    ├── app/
    │   ├── layout.tsx + template.tsx + AppLayout.tsx (sidebar + mobile drawer + profile + ErrorBoundary wrap)
    │   ├── page.tsx (landing)
    │   ├── login/ + signup/ + forgot-password/ + reset-password/  (cookie-based, credentials:include)
    │   ├── dashboard/ (tools + AI Strategy from /revision-plan)
    │   ├── tutor/ (chat + /ask/stream — currently mismatched with backend plain tokens vs expected agent events)
    │   ├── practice/ (/practice AI MCQs, zustand)
    │   ├── mock-tests/ (hardcoded list) + [id]/ (engine: timer ref, skip-not-log, save to /save-mock-test + /save-errors)
    │   ├── progress/ + error-log/ (now render real data)
    │   └── middleware.ts (route protection via access_token cookie)
    │
    ├── components/ui/ (ErrorBoundary, Blackhole bg, shadcn etc.)
    ├── store/useAppStore.ts (zustand; no persist)
    ├── lib/api.ts (API_URL)
    └── ...
```

---

## HOW DATA FLOWS (end to end) — See 00_CURRENT_AUDIT... for current accuracy + gaps (e.g. streaming format mismatch, RAG effectiveness)

```
User takes mock test
  → frontend [id]/page.tsx grades answers locally (uses answersRef, only logs actual wrongs)
  → POST /save-mock-test  → database.py::save_mock_test() → MockTest table (Date, FKs)
  → POST /save-errors     → database.py::save_error_log() (with rollback) → ErrorLog table

User visits Dashboard
  → GET /revision-plan (cached) → data_analyzer.py::get_ai_revision_plan() (last 15 ErrorLog → LLM via tutor.run_cloud_model)
      → returns {primary_weakness, critical_concepts, actionable_checklist}

User visits Progress
  → GET /stats (cached, response_model) → data_analyzer (limited load_data + pandas) → returns accuracy, testsTaken, recent_tests, weak_areas

User uses AI Tutor
  → POST /ask (auth) or /ask/stream (auth) → tutor.py (RAG auto-inject if no context + Groq stream/plain or fallback)
```

---

## WHICH GUIDE TO READ (Updated)

**Primary:** `FIXES/00_CURRENT_AUDIT_AND_UPGRADE_STRATEGY.md` (full current state, incorporated vs remaining, sequence, enterprise strategy + direct mapping to GovExam roadmap phases).

Historical mapping (old files) left for archaeology:

| Source file you're editing         | Historical note (see CURRENT_AUDIT Section 1 for status) |
|------------------------------------|----------------------------------------------------------|
| backend/app/main.py                | Many critical + security + arch fixes applied (auth, rate limits, caching, logging, response_models, health, lifespan/Alembic, etc.). Remaining: streaming format, no /v1, no input limits, etc. |
| backend/app/core/config.py         | Secrets handling improved (raises). CORS still static list. |
| backend/app/models/database.py     | Pool, Date, cascades, rollbacks, is_verified, AuthToken good. init_db removed. |
| backend/modules/tutor.py + rag.py etc. | RAG "wired" (auto inject) but fragile (path, duplicate loads, tiny data, duplicate code, logging). |
| frontend/app/mock-tests/[id]/page.tsx + mock-tests/page.tsx | Timer/skip fixes in; list & seeding still hardcoded/broken. |
| frontend/app/error-log/page.tsx + progress/page.tsx | Data rendering + interfaces much improved. |
| frontend/middleware.ts + AppLayout.tsx | Protection + mobile added; sidebar always-on (public page issue remains). |
| frontend/app/tutor/page.tsx        | Streaming + AnimatedMarkdown + agentThoughts UI now mismatched with current backend (top remaining break). |
| docker-compose + alembic           | Alembic used; compose paths/CWD still need polish per audit. |
