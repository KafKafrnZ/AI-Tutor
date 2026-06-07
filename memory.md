# AI-Tutor Project Memory (Compact)

**Last Updated**: 2026-06-07 — Compacted + Multi-agent + Push plan

**Purpose**: Quick context reload for every session when user references the scratch path.

---

## Core Identity
- **Project**: Ascend AI Tutor (IBPS SO / UPSC / Govt exam AI tutor)
- **Local Scratch**: `\\?\C:\Users\dante\.gemini\antigravity\scratch\AI-Tutor` (active dev workspace)
- **GitHub**: `KafKafrnZ/AI-Tutor` (default: `main`)
- **Stack**: Next.js 16 + React 19 (TS), FastAPI + Postgres + Alembic, ChromaDB hybrid RAG (active in `app/core/rag.py`), Groq LLM, SSE streaming, 3D (R3F), Zustand, glassmorphism UI.

**Multi-Agent Capability** (new):
- User has: **Claude Pro + Gemini Pro + GPT Plus**
- We can/should split deep tasks across agents (e.g. one does heavy backend/RAG, one does frontend/UI, one does tests/infra).
- Explicitly discuss delegation when work is large.

---

## Recent Major Work (Local Scratch is Ahead)
**Completed from YOUR_FIXES + Polish**:
- Password eye toggles (in `AuthCard.tsx`)
- 5-min warning, reduced motion, error-log retry + pagination, multi-turn tutor history
- **Critical fix**: Fixed broken mock-tests/[id] (missing handler + imports)
- **Big refactor**: Mock test engine now uses clean `options[] + correct_answer (letter)` shape instead of brittle `option_a/b/c/d`. Trusts backend normalization. Much more robust.
- Deprecated legacy FAISS modules (`modules/rag.py`, `faiss_index.py`, `embeddings.py`). Active RAG = `app/core/rag.py`
- Added 4 new backend tests: Practice, Ask+history, Stats with data, RAG retrieve
- Docker: Fixed build context, added healthchecks (DB + /health), improved dev override with docs
- GitHub vs Local comparison performed

**Local advantages vs GitHub main**:
- Stronger mock test data mapping & maintainability
- Better test coverage on key flows
- More production-ready Docker setup
- Cleaner legacy code handling

GitHub main has recent large "Ascend frontend architecture" merges but lags on the above polish items.

---

## Current Status & Immediate Plan
- Local scratch = current best working copy with robustness improvements.
- **Immediate goal**: Decide if local is the better production baseline → push to GitHub if yes.
- Post-push: Resume targeted refinement of specific endpoints + UI.

**Important**: Never force-push `main`. Always use feature branch + PR.

---

## Key Architecture Decisions (Remember)
- Mock tests: Backend does normalization. Frontend should consume `options[]` + letter.
- RAG: Only `app/core/rag.py` (Chroma hybrid). Old FAISS is dead.
- Auth: Cookie-based JWT.
- Tests: In-memory SQLite + heavy mocking for LLM paths.
- Always read this `memory.md` first on new sessions referencing the scratch path.

---

## Next Actions (Current)
1. Compact memory (done).
2. Quick production assessment (local vs GitHub main).
3. Prepare push (branch name, commit, PR text).
4. Execute push workflow (guide + use GitHub MCP tools where possible).
5. After push → shift to endpoint/UI refinement.

**Recall prompt for future sessions**:
"Loaded compact memory. Local scratch at [path] is ahead on mock robustness, tests, Docker. GitHub = KafKafrnZ/AI-Tutor. User has Claude/Gemini/GPT for multi-agent work. Current: Assess if local is production baseline → push → then refine endpoints/UI."

---
**End of Compact Memory**