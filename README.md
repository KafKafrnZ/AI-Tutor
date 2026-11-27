# Ascend AI Tutor

> **Work in progress.** A personal project, not launched, with no users and no live demo. The question corpus is
> placeholder data and answer quality has not been measured yet. This page lists what works, what does not, and
> how I plan to deal with it.

A retrieval-augmented (RAG) tutor for Indian government exams. Python and FastAPI backend, ChromaDB, PostgreSQL,
Next.js frontend.

## What works on `main`

```
question -> input checks -> hybrid retrieval -> token-budgeted prompt -> LLM -> streamed answer (SSE)
                                  |
                                  +-> keyword search if the vector store fails
```

| Part | What it does | Code |
|---|---|---|
| Chunking | Sentence-aware, 1,000 characters with 200 overlap; duplicates skipped by SHA-256 | [`rag.py`](backend/app/core/rag.py) |
| Retrieval | `bge-small-en-v1.5` embeddings (FastEmbed) in ChromaDB (HNSW, cosine), one collection per embedding model. Over-fetches 5x, drops chunks below a similarity threshold, ranks by 0.7 vector similarity + 0.3 keyword overlap, then collapses near-duplicates | [`rag.py`](backend/app/core/rag.py) |
| Retrieval fallback | Keyword ranking when the vector store is empty or errors; documents sharing under half the query words are dropped | [`rag.py`](backend/app/core/rag.py) |
| Retrieval smoke eval | hit@5, MRR, duplicate crowding and abstention on a 32-query synthetic set | [`eval_retrieval.py`](backend/scripts/eval_retrieval.py) |
| LLM client | One async client for Groq, OpenAI-compatible and Anthropic APIs, with retries, backoff and timeouts. Default: Llama 3.3 70B on Groq | [`llm_adapter.py`](backend/app/core/llm_adapter.py) |
| Streaming | Server-Sent Events. A failure before the first token returns a 503, not a broken stream | [`tutor.py`](backend/app/routers/tutor.py) |
| Context budget | Drops the oldest turns first; the system prompt and retrieved context stay pinned | [`context_budget.py`](backend/app/core/context_budget.py) |
| Input checks | Length limits, HTML stripping, prompt-injection patterns. A first filter, not a defence (see below) | [`guards.py`](backend/app/core/guards.py) |
| Auth | httpOnly JWT cookies, refresh-token rotation, CSRF origin checks, rate limits | [`auth.py`](backend/app/core/auth.py), [`csrf.py`](backend/app/core/csrf.py) |
| CI | pytest against PostgreSQL, Alembic migration round trip, mypy, frontend checks | [`ci.yml`](.github/workflows/ci.yml) |

Also here: mock tests, a progress page, speech **input** through the browser's Web Speech API (no speech output, and
only in browsers that support it), and a small 3D topic demo at `/explore` with seven sample nodes, not a syllabus.
There is a web app manifest but no service worker, so nothing works offline.

## Known problems, and the plan for each

Ordered by how much they affect whether an answer can be trusted. "On a branch" means written on
[`wip/2026-09-21-billing-quota-ui`](https://github.com/KafKafrnZ/AI-Tutor/tree/wip/2026-09-21-billing-quota-ui), not reviewed, not merged.

| # | Problem | Plan | Status |
|---|---|---|---|
| 1 | **The corpus is placeholder data.** 200 rows but 54 distinct questions: 14 questions repeated as 160 "(Variation N)" rows, 20 templated arithmetic rows, and 20 rows that only say "Data Interpretation pattern question N". The exam and year labels have no source, so these are **not** real past papers | Replace with items that each carry a source, or are marked synthetic. Fail ingestion on near-duplicates and on a missing source | Not started. Blocks every item that depends on real content |
| 2 | **The prompt told the model to mention past-paper trends**, and the corpus cannot support that | Remove the instruction until #1 is done; then allow a trend only with a retrieved, sourced item | Done on `fix/rag-trust-basics`: the trend section is gone, the model must not claim exams, years or trends, unsourced exam/year labels are no longer shown to it as a "Source", and an empty or non-answering context must start the reply with a fixed "Not found in the question bank" line |
| 3 | **No retrieval evaluation.** The 0.7 / 0.3 weights are a guess | 50 hand-labelled questions; report hit@5 and MRR, vector-only against keyword-only against hybrid; run it in CI before any index change | Not started. Needs #1 |
| 4 | **Keyword overlap is a weak lexical ranker** | BM25 + vector with reciprocal rank fusion, then a cross-encoder reranker. Merge only if it beats the baseline in #3 | On a branch, unmeasured |
| 5 | **No groundedness check.** "Never hallucinate" in a prompt does not prevent it | Cite retrieved chunk ids, check that cited ids exist, abstain below a retrieval threshold, and score answers on a labelled set that includes unanswerable questions | Not started |
| 6 | **Malformed quiz JSON became a fake "Parse Error" question** whose correct answer is always A | Schema-validated structured output with bounded retries, and a real error instead of a fake question | Done on `fix/rag-trust-basics`: questions are validated (4 distinct options, answer must be one of them, letter answers such as "B" mapped to the option text, which the frontend needs to mark them right); no valid question gives a 502 `BAD_MODEL_OUTPUT`. Retries and structured output are still on the wip branch |
| 7 | **Regex prompt-injection checks are easy to bypass** | Treat retrieved and user text as untrusted, keep secrets and tools out of the model's reach, check outputs, keep a regression set of attacks | Not started |
| 8 | **One provider failure fails the answer** once retries run out | Fall back to a second model before the first token; never switch models mid-answer | On a branch, with tests |
| 9 | **A hung vector query can stall a worker** | Query timeout, then keyword fallback | On a branch, with tests |
| 10 | **A dropped stream loses the answer** | Buffer tokens and replay from the last event id | On a branch, with tests |
| 11 | **No latency or cost numbers** | Log retrieval time, time to first token and token counts per request; report p50 and p95 | Not started |
| 12 | **LLM spend is only rate-limited per minute** | Daily quotas enforced on the server | On a branch, with tests |
| 13 | **Nothing is deployed** | Deploy only after 1, 2, 3 and 5 | Not started |
| 14 | **The embedding model was not the one named here.** `chromadb` 0.5.23 has no `FastEmbedEmbeddingFunction`, so the import always failed and every run silently used Chroma's default `all-MiniLM-L6-v2` | Wrap FastEmbed directly, log any fallback as a warning, give each model its own collection (both models make 384-dim vectors, so they would mix silently) | Done on `fix/rag-trust-basics` |
| 15 | **Near-duplicates filled every slot, and off-corpus questions still got 8 unrelated chunks** | Collapse near-duplicate chunks; drop chunks under a similarity threshold | Done on `fix/rag-trust-basics`; see the smoke numbers below |

**Smoke numbers** (`python backend/scripts/eval_retrieval.py`, 2026-11-27). The set is 32 synthetic queries
written against the placeholder corpus: 20 it can answer, 12 it cannot, several of them near misses on purpose.
It is good for before/after comparisons only, **not** a quality claim.

| | `main` (MiniLM by accident, no threshold) | `fix/rag-trust-basics` (bge-small, threshold 0.75, dedupe) |
|---|---|---|
| hit@5 on answerable | 1.00 | 0.70 |
| unanswerable with no context returned | 0 of 12 | 12 of 12 |
| distinct items among the chunks sent | 1.38 of 8 | 1 of 1 |

The threshold trades recall for never sending wrong evidence. With bge-small the best-match similarities of
answerable (0.67-0.88) and unanswerable (0.52-0.74) queries overlap, so no threshold gets both right. A quick test of
two CPU cross-encoder rerankers narrowed the overlap but did not remove it: near misses such as "reverse repo rate"
against the corpus's "repo rate" still score as relevant, because a reranker measures topic, not whether the passage
answers. That is problem 5's job (answer-level checks), measured on a real labelled set (problem 3).

Order of work: 1 and 2, then 3, then 4 and 5 judged by 3, then the reliability items in small pull requests split out
of the branch. The longer engineering list is in [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).

**Rule for this repo:** no quality number goes in this README until a script in the repo reproduces it.

## Run it locally

Needs Docker and an LLM API key (Groq by default).

```bash
cp backend/.env.example .env.local          # set JWT_SECRET and LLM_API_KEY
cp frontend/.env.example frontend/.env.local
docker compose up --build
```

This starts PostgreSQL, Redis, the FastAPI backend on port 8000 (migrates, then ingests the placeholder corpus into an
embedded ChromaDB) and the Next.js frontend on port 3000. The first start downloads the embedding model.

Stack: FastAPI, SQLAlchemy, Alembic, PostgreSQL, ChromaDB, FastEmbed, Redis, structlog, slowapi, Sentry; Next.js 16,
React 19, Tailwind 4, Zustand, React Three Fiber. Deploy notes: [DEPLOY.md](DEPLOY.md). License: [MIT](LICENSE).
