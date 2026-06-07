# Ascend AI — System Roadmap & Learning Guide

> **What this is:** the single source of truth for (a) what Ascend AI is becoming, (b) the complete user flow from the welcome page through Plus-tier payment + email verification, (c) the phased plan to get there as a fully open-source, self-hostable, enterprise-auctionable system, and (d) everything you should learn — LLM, UI, graphics, Blender, infra — to fully understand and control it.
>
> **Status legend:** ✅ done · 🟡 partial · ⛔ not started
>
> _Last updated: 2026-06-06_

---

## Table of Contents

1. [North Star](#1-north-star)
2. [Current State (honest snapshot)](#2-current-state-honest-snapshot)
3. [The Full User Flow](#3-the-full-user-flow-welcome--plus-tier)
4. [Transition Roadmap (phased)](#4-transition-roadmap-phased)
5. [Target Architecture](#5-target-architecture)
6. [The Plus-Tier Flow in Detail (mail + transaction verification)](#6-the-plus-tier-flow-in-detail)
7. [Learning Tracks](#7-learning-tracks)
8. [Suggested Learning Order](#8-suggested-learning-order)
9. [Open Decisions & Risks](#9-open-decisions--risks)
10. [Glossary](#10-glossary)

---

## 1. North Star

**Ascend AI** is an AI tutor for **Indian government exams**, launching with **UPSC & State PSC** as the flagship vertical and expanding to SSC/RRB, Banking, Defence, and Teaching over time.

**Non-negotiable constraints (these define every technical choice):**

| Constraint | Implication |
|---|---|
| **Fully open-source** | Every component must be OSS with a **permissive license** (Apache-2.0 / MIT / BSD). This rules out Llama (Community License) and Groq (hosted API) for the core. |
| **Self-hostable** | A buyer must be able to run the entire system on their own infrastructure — no mandatory third-party API in the critical path (payments are the one unavoidable exception). |
| **Enterprise-auctionable** | It must be packageable (containers + clear deploy docs), observable, secure, and license-clean enough to *sell* as a turnkey product. |
| **Robustness over speed** | Deliberately taking the hard path. No shortcuts that compromise ownership or quality. |

---

## 2. Current State (honest snapshot)

### Stack as it exists today

| Layer | Today | OSS / self-host clean? |
|---|---|---|
| Frontend | Next.js 16.2.6 (App Router, TS), Tailwind, framer-motion, shadcn-style UI; deployed on Vercel | 🟡 Code is OSS; Vercel is a host (replaceable) |
| Backend | FastAPI single-file `backend/app/main.py`; deployed on Railway | 🟡 Code is OSS; Railway is a host (replaceable) |
| DB | PostgreSQL (local on port 1327) | ✅ Postgres is OSS |
| Auth | JWT in an httpOnly cookie (`access_token`) | ✅ |
| LLM | **Groq API → Llama 3.3 70B**, streamed via SSE | ⛔ Groq is hosted; Llama license isn't permissive |
| RAG corpus | `backend/data/pyqs.json` (~200 IBPS PYQs) | 🟡 Data exists; tiny + IBPS-specific |
| Tutor logic | `backend/modules/tutor.py` — PYQ Agent → Reasoning Agent → Review Agent | 🟡 Logic exists; prompt is IBPS-tuned |
| Proxy | `frontend/app/api/[...path]/route.ts` + `frontend/proxy.ts` middleware; `next.config.ts` empty | ✅ Works — do not change |

### Routes that exist

`/` ✅ (rebranded to Ascend AI) · `/login` · `/signup` · `/verify-email` · `/forgot-password` · `/reset-password` · `/dashboard` · `/tutor` · `/practice` · `/mock-tests` · `/mock-tests/[id]` · `/progress` · `/error-log`

### What's done vs. what's IBPS-locked

- ✅ **Welcome page** rebranded to Ascend AI (hybrid cosmic/enterprise, UPSC & State PSC framing).
- ✅ **Brand** updated in `frontend/app/layout.tsx` (metadata) and `frontend/app/AppLayout.tsx` (sidebar).
- 🟡 **Auth/dashboard/inner pages** — likely still carry IBPS copy (cosmetic).
- ⛔ **Domain model** — the *substance* (exam definitions, syllabi, question bank, tutor prompt, mock metadata, RAG corpus) is still IBPS-only. This is the real reframe.
- ⛔ **LLM** — still Groq/Llama (must migrate to self-hosted permissive OSS).
- 🟡 **Email** — signup/reset tokens are **logged to console**, not emailed (`logger.info` in `main.py`).
- ⛔ **Plus tier / payments** — a `plan` field exists (`free`/`plus`) but there is **no billing, no payment, no transaction verification** yet.

---

## 3. The Full User Flow (welcome → Plus tier)

This is the complete journey a user takes, end to end. Each node lists **what the user sees**, **what happens server-side**, and **state**.

```
┌─────────────┐   ┌──────────┐   ┌────────────────┐   ┌────────┐   ┌────────────┐
│  1. Welcome │──▶│ 2. Signup│──▶│ 3. Verify email│──▶│ 4.Login│──▶│5. Dashboard│
└─────────────┘   └──────────┘   └────────────────┘   └────────┘   └─────┬──────┘
                                                                          │
        ┌─────────────────────────────────────────────────────────────────┤
        ▼                ▼                 ▼                ▼               ▼
   ┌─────────┐     ┌──────────┐     ┌────────────┐   ┌──────────┐   ┌───────────────┐
   │6. Tutor │     │7.Practice│     │8.Mock Tests│   │9.Progress│   │10.Mistake Lock│
   └─────────┘     └──────────┘     └────────────┘   └──────────┘   └───────────────┘
        │
        ▼ (hits a Plus-gated feature, or clicks "Upgrade")
   ┌──────────────┐   ┌───────────────┐   ┌──────────────────────┐   ┌──────────────┐
   │11. Pricing   │──▶│12. Pay (PSP)  │──▶│13. Verify transaction│──▶│14. Entitle + │
   │    page      │   │   checkout    │   │   (webhook + sig)    │   │ receipt email│
   └──────────────┘   └───────────────┘   └──────────────────────┘   └──────────────┘
```

| # | Node | User sees | Server-side | State |
|---|---|---|---|---|
| 1 | **Welcome** | Hero + capabilities + open-source pitch + CTAs | Static page (public route) | ✅ |
| 2 | **Signup** | Email/password form | Create user (unverified), hash password, mint verification token | 🟡 token logged, not emailed |
| 3 | **Verify email** | "Check your inbox" → click link | `/verify-email?token=` validates token, marks `verified=true` | 🟡 no real email |
| 4 | **Login** | Email/password | Validate creds → set `access_token` httpOnly cookie | ✅ |
| 5 | **Dashboard** | Overview, nav, plan badge | `GET /me` returns profile + `plan` | ✅ |
| 6 | **AI Tutor** | Chat; streamed answer + (future) diagrams/charts | `/ask` SSE: PYQ → Reasoning → Review agents over RAG | 🟡 works; visuals + OSS model pending |
| 7 | **Practice** | Adaptive question sets | Pull from question bank, target weak areas | 🟡 IBPS content |
| 8 | **Mock Tests** | Timed full-length tests | `MOCK_TEST_META` + `MasterQuestion` table | 🟡 IBPS; DB needs seeding |
| 9 | **Progress** | Analytics, trends | Aggregate attempts | 🟡 |
| 10 | **Mistake Locker** | Saved errors | Per-user error log | 🟡 |
| 11 | **Pricing** | Free vs Plus, monthly/annual | Serve plan catalog | ⛔ build |
| 12 | **Pay** | PSP checkout (UPI/card) | `POST /billing/create-order` → PSP order | ⛔ build |
| 13 | **Verify transaction** | "Processing…" → success | Webhook + signature verification (source of truth) | ⛔ build |
| 14 | **Entitle + receipt** | Plus unlocked; receipt email | Flip `plan→plus`, set expiry, idempotent, send receipt | ⛔ build |

> See [Section 6](#6-the-plus-tier-flow-in-detail) for the exact mail + transaction-verification sequence — the specific endpoint you asked about.

---

## 4. Transition Roadmap (phased)

Each phase is shippable on its own. Earlier phases are low-risk cosmetic work; later phases are the heavy, defining work.

### Phase 0 — Welcome page rebrand ✅ DONE
- Ascend AI hero, metadata, sidebar brand.
- **Files:** `frontend/app/page.tsx`, `layout.tsx`, `AppLayout.tsx`.

### Phase 1 — UI / brand sweep 🟡 NEXT
- **Goal:** every screen reads "Ascend AI / government exams," not IBPS.
- **Tasks:** audit + update `login`, `signup`, `verify-email`, `forgot-password`, `reset-password`, `dashboard`, and all inner pages for IBPS copy, logos, titles, and microcopy. Build a `/pricing` shell (even before billing works).
- **Done when:** a user can walk welcome → signup → dashboard → every tab and never sees "IBPS."

### Phase 2 — Government-exam domain model ⛔ (the real reframe)
- **Goal:** turn an IBPS app into a multi-exam platform.
- **Tasks:**
  - Introduce an **Exam / Subject / Topic** schema (e.g., `Exam → Paper → Subject → Topic → Question`), seeded for UPSC (Prelims GS+CSAT, Mains GS I–IV + Essay + Optional) and State PSC variants.
  - Refactor the tutor system prompt (`backend/modules/tutor.py`) to be **exam-aware** (inject the active exam's syllabus + style).
  - Make `MOCK_TEST_META` data-driven per exam instead of hardcoded.
  - Tag the question bank + RAG corpus by exam/subject/topic.
- **Done when:** the same codebase serves a UPSC mock and (later) an SSC mock by config, not code change.

### Phase 3 — Open-source LLM migration ⛔ (defining for "auctionable")
- **Goal:** remove Groq + Llama; self-host a permissive model.
- **Tasks:**
  - Stand up **vLLM** or **SGLang** serving an **Apache-2.0/MIT model** (Qwen2.5/Qwen3, Mistral/Mixtral, or DeepSeek).
  - Swap the backend LLM client (currently Groq) for an **OpenAI-compatible** call to your vLLM/SGLang endpoint (both expose that API, so the code change is small).
  - Implement the **answer + `visuals[]` contract** using **grammar-constrained decoding** (XGrammar / Outlines) so JSON/Mermaid is valid by construction.
  - Add the frontend visual renderer (Mermaid + Recharts) with validation/fallback.
  - **Note on the count problem:** JSON-schema can't enforce array length, so "exactly N questions/diagrams" still needs prompt + post-validation + one retry.
- **Done when:** the tutor streams answers + renders diagrams with zero dependency on any hosted LLM API.

### Phase 4 — Email / verification infrastructure ⛔
- **Goal:** real transactional email for verification, password reset, and receipts.
- **Tasks:** pick an email path (see [6.1](#61-email-verification)), wire SPF/DKIM/DMARC, templatize emails, replace the `logger.info` token stubs in `main.py`.
- **Done when:** signup sends a real verification email; reset works end to end.

### Phase 5 — Plus tier: billing & payments ⛔
- **Goal:** a user can buy Plus, and entitlement is granted only after verified payment.
- **Tasks:** pricing page → PSP order creation → checkout → **webhook + signature verification** → idempotent entitlement flip → receipt email. See [Section 6](#6-the-plus-tier-flow-in-detail).
- **Done when:** a real payment unlocks Plus, a duplicate webhook never double-grants, and a failed payment never grants.

### Phase 6 — Enterprise hardening & self-host packaging ⛔
- **Goal:** make it sellable and operable by a buyer.
- **Tasks:** Docker Compose (and/or Helm chart) for the whole stack (frontend + backend + Postgres + vLLM + vector DB); reverse proxy (Caddy/Nginx); secrets management; observability (Prometheus + Grafana + Langfuse for LLM traces); backups; rate limiting; OWASP pass; multi-tenant considerations; admin panel; license/EULA.
- **Done when:** a buyer can `docker compose up` (or `helm install`) and run the whole thing on their own servers.

---

## 5. Target Architecture

```
                          ┌────────────────────────────┐
   Browser  ──────────▶   │  Next.js frontend           │
   (same origin /api/*)   │  - welcome / auth / app UI  │
                          │  - Mermaid + Recharts render│
                          └──────────────┬──────────────┘
                                         │ /api/* (proxy: route.ts + proxy.ts)
                                         ▼
                          ┌────────────────────────────┐
                          │  FastAPI backend            │
                          │  - auth (JWT cookie)        │
                          │  - tutor agents             │
                          │  - billing / entitlement    │
                          │  - email service            │
                          └───┬───────────┬──────────┬──┘
                              │           │          │
                ┌─────────────▼──┐  ┌─────▼──────┐  ┌▼─────────────┐
                │ PostgreSQL     │  │ vLLM /     │  │ Vector DB     │
                │ (+ pgvector?)  │  │ SGLang     │  │ Qdrant /      │
                │ users, attempts│  │ (Qwen/etc) │  │ pgvector      │
                │ billing, exams │  │ OpenAI-API │  │ RAG corpus    │
                └────────────────┘  └────────────┘  └───────────────┘
                              │
                ┌─────────────▼───────────┐      ┌──────────────────┐
                │ Email (Postal/SES/Resend)│      │ Payment PSP       │
                │ verify / reset / receipt │      │ (Razorpay/Stripe) │
                └──────────────────────────┘      │ + OSS billing     │
                                                   │ (Kill Bill/Lago)  │
                                                   └──────────────────┘
```

**Key principle:** the only components that *must* be third-party are the **payment processor** (you cannot self-host a PSP) and, optionally, an email-delivery relay. Everything else runs on the buyer's metal.

---

## 6. The Plus-Tier Flow in Detail

This is the specific endpoint you asked about: **welcome → … → mail and transaction verification for Plus tier.**

### 6.1 Email verification

**Token flow (applies to signup verify, password reset, and receipts):**

1. Server generates a token — either a signed JWT with short expiry, or a random token whose **hash** is stored with an expiry (random+hash is safer; the raw token only lives in the email).
2. Server sends an email containing a link: `https://app/verify-email?token=<token>`.
3. User clicks → frontend posts the token to the backend → backend validates (not expired, not used), marks `verified=true`, invalidates the token.
4. Access is gated on `verified` per `settings.REQUIRE_EMAIL_VERIFICATION`.

**Email delivery options (the hard part is deliverability, not sending):**

| Option | License / model | Self-host? | Notes |
|---|---|---|---|
| **Postal** | MIT, self-hosted mail server | ✅ Full | True OSS self-host. You own delivery; you also own SPF/DKIM/DMARC + IP reputation (real work). |
| **Plunk** | OSS, self-hostable transactional email | ✅ | Friendlier than running raw Postfix; still needs a sending domain. |
| **Listmonk** | AGPL | ✅ | Great for bulk/newsletters; not ideal for transactional. |
| **Amazon SES / Resend / Postmark** | Hosted (not OSS) | ❌ | Pragmatic, excellent deliverability. Keep as a *pluggable* adapter so a buyer can swap to self-host. |

**Recommendation:** build an **email adapter interface** in the backend (`send_email(to, template, ctx)`), ship a Postal/SMTP implementation for the self-host story, and allow an SES/Resend implementation as a config swap. This keeps the system "fully OSS-capable" while staying pragmatic.

> ⚠️ Replace the `logger.info(token)` stubs in `backend/app/main.py` at `/signup` and `/forgot-password` with real `send_email(...)` calls (tracked in `pending-work` memory).

### 6.2 Payment + transaction verification

**Reality check:** a payment *processor* (PSP) is the one thing you can't self-host — you need a licensed gateway. But the **billing/entitlement logic is yours and open-source**.

| Component | Choice | Why |
|---|---|---|
| **PSP (India)** | **Razorpay** (UPI, cards, netbanking) | Standard for Indian audiences; great UPI support. Alternatives: Cashfree, PayU. |
| **PSP (global, later)** | **Stripe** | If you expand beyond India. |
| **Billing/subscription engine** | **Kill Bill** (Apache-2.0) or **Lago** (open-source) | Self-hostable subscription, invoicing, entitlement. Kill Bill is the most enterprise-mature OSS option. |

**The exact sequence (Razorpay shown; Stripe is analogous):**

```
1. User clicks "Upgrade to Plus" (monthly/annual).
2. Frontend → POST /billing/create-order { plan }
3. Backend → Razorpay orders.create(amount, currency, receipt)
            → returns { order_id, key_id }
4. Frontend opens Razorpay Checkout with order_id.
5. User pays. Checkout returns { razorpay_payment_id,
   razorpay_order_id, razorpay_signature } to the frontend.
6. Frontend → POST /billing/verify { the three values above }
7. Backend verifies signature:
   expected = HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET)
   assert expected == razorpay_signature   ← client-side confirmation
8. ALSO (source of truth): Razorpay sends a WEBHOOK
   POST /billing/webhook  event=payment.captured
   Backend verifies the webhook signature with the WEBHOOK SECRET.
9. On verified capture (idempotent — dedupe on payment_id):
   - create subscription/entitlement row
   - set user.plan = "plus", set expires_at
   - write an audit record
10. Send receipt email (Section 6.1).
11. Frontend re-fetches /me → UI unlocks Plus features.
```

**Bulletproofing rules (this is where "enterprise" is won or lost):**

- **Webhooks are the source of truth, not the client callback.** The browser can be closed mid-payment; the webhook still arrives. Grant entitlement on the verified webhook.
- **Idempotency:** dedupe by `payment_id`. Duplicate/retried webhooks must never double-grant or double-charge.
- **Verify every signature** (both the checkout callback HMAC and the webhook HMAC) — never trust an unsigned "payment succeeded" from the client.
- **Handle the full lifecycle:** `payment.failed`, refunds, `subscription.charged` (renewals), `subscription.cancelled`, grace periods, expiry → downgrade.
- **Reconciliation job:** a periodic check against the PSP for payments your webhook may have missed.
- **Never store raw card data.** The PSP handles PCI scope; you store only IDs + status.

---

## 7. Learning Tracks

To **understand and control** every part of this system, here are curated, real resources organized by pillar. Levels: 🟢 Beginner · 🟡 Intermediate · 🔴 Advanced. For papers, the arXiv ID is given where stable; otherwise search the title.

### 7.1 LLM & RAG (the brain)

**Foundations — papers**

| Resource | Type | Covers | Level |
|---|---|---|---|
| *Attention Is All You Need* (Vaswani et al., 2017) — arXiv:1706.03762 | Paper | The Transformer — the architecture under everything | 🟡 |
| *Retrieval-Augmented Generation…* (Lewis et al., 2020) — arXiv:2005.11401 | Paper | The original RAG — exactly your tutor's pattern | 🟡 |
| *RAG for LLMs: A Survey* (Gao et al., 2023) — arXiv:2312.10997 | Paper | Modern RAG landscape (chunking, rerank, eval) | 🟡 |
| *Dense Passage Retrieval* (Karpukhin et al., 2020) — arXiv:2004.04906 | Paper | How retrieval embeddings actually work | 🟡 |
| *ColBERT* (Khattab & Zaharia, 2020) — arXiv:2004.12832 | Paper | Late-interaction retrieval (high-quality search) | 🔴 |
| *Chain-of-Thought Prompting* (Wei et al., 2022) — arXiv:2201.11903 | Paper | Why "reasoning" prompts work — your Reasoning Agent | 🟢 |
| *LoRA* (Hu et al., 2021) — arXiv:2106.09685 | Paper | Cheap fine-tuning — how you'd specialize a model per exam | 🟡 |
| *QLoRA* (Dettmers et al., 2023) — arXiv:2305.14314 | Paper | Fine-tune big models on one GPU | 🔴 |
| *FlashAttention* (Dao et al., 2022) — arXiv:2205.14135 | Paper | Why modern inference is fast | 🔴 |
| *Efficient Memory Mgmt for LLM Serving (PagedAttention/vLLM)* — arXiv:2309.06180 | Paper | The engine you'll self-host | 🔴 |
| Qwen2.5 / Mistral 7B / DeepSeek technical reports | Papers | Your candidate models (find on arXiv / HF) | 🟡 |

**Foundations — videos & courses**

| Resource | Type | Why |
|---|---|---|
| **Andrej Karpathy — "Neural Networks: Zero to Hero"** (YouTube) incl. *"Let's build GPT"* and *"Let's build the GPT Tokenizer"* | Course (free) | The single best ground-up build of an LLM. Watch this first. 🟢→🔴 |
| **3Blue1Brown — Neural Networks series** (incl. transformer/attention chapters) | Videos | The best visual intuition for what a transformer does. 🟢 |
| **Jay Alammar — "The Illustrated Transformer"** (jalammar.github.io) | Article | The classic visual explainer. 🟢 |
| **Stanford CS224N — NLP with Deep Learning** (YouTube) | Course | Rigorous foundations. 🟡 |
| **Stanford CS25 — Transformers United** (YouTube) | Lectures | Frontier topics by guest researchers. 🔴 |
| **Hugging Face — LLM Course / NLP Course** (huggingface.co/learn) | Course (free) | Hands-on with the actual libraries. 🟢→🟡 |
| **DeepLearning.AI short courses** (RAG, building LLM apps) | Courses | Practical RAG patterns. 🟢 |

**Serving / structured output (what you'll operate)**

| Resource | Type | Why |
|---|---|---|
| **vLLM docs** (docs.vllm.ai) | Docs | The inference server you'll likely run. 🟡 |
| **SGLang** (GitHub) | Docs | Faster structured-output serving alternative. 🟡 |
| **Outlines** (dottxt-ai) & **XGrammar** | Docs | Grammar-constrained decoding — guarantees valid JSON/Mermaid. 🟡 |
| **Qdrant docs** + **pgvector** (GitHub) | Docs | Vector storage for RAG. 🟢 |
| **Langfuse** (OSS LLM observability) | Docs | Trace/debug/eval your tutor in production. 🟡 |

### 7.2 UI & Frontend (what the user touches)

| Resource | Type | Why | Level |
|---|---|---|---|
| **react.dev** (official React docs) | Docs | The framework your UI is built on | 🟢 |
| **Next.js docs** (nextjs.org/docs) — App Router | Docs | ⚠️ You're on Next **16** with breaking changes — also read `node_modules/next/dist/docs/` per your `AGENTS.md` | 🟡 |
| **TypeScript Handbook** (typescriptlang.org) | Docs | Type safety across the codebase | 🟢 |
| **Tailwind CSS docs** (tailwindcss.com) | Docs | Your entire styling system | 🟢 |
| **Motion (framer-motion) docs** (motion.dev) | Docs | Your animations (hero, nav transitions) | 🟢 |
| **shadcn/ui** (ui.shadcn.com) | Docs | Your component primitives (dropdown, avatar, etc.) | 🟢 |
| **"Refactoring UI"** — Adam Wathan & Steve Schoger | Book | The fastest way to make UI look professional (critical for an enterprise sell) | 🟢 |
| **Josh W. Comeau** (joshwcomeau.com; "CSS for JS Devs") | Blog/Course | Deep, intuitive CSS | 🟡 |
| **Kevin Powell** (YouTube) | Videos | Modern CSS layout mastery | 🟢 |
| **Lee Robinson** (leerob.com / YouTube) | Videos | Next.js patterns from a Vercel lead | 🟡 |
| **Laws of UX** (lawsofux.com) + **web.dev** (Google) | Reference | UX heuristics, performance, accessibility | 🟢 |

### 7.3 Graphics (the cosmic visuals + data viz)

Your welcome page uses a **`BlackholeBackground`** — almost certainly WebGL/shader work. This track lets you own and modify it, plus the diagram/chart rendering.

| Resource | Type | Why | Level |
|---|---|---|---|
| **The Book of Shaders** (thebookofshaders.com) — Patricio Gonzalez Vivo | Interactive book (free) | The canonical intro to GLSL fragment shaders (your blackhole is one) | 🟡 |
| **Three.js Journey** (threejs-journey.com) — Bruno Simon | Course (paid) | The definitive Three.js + React Three Fiber course; covers shaders + the Blender→web pipeline | 🟡→🔴 |
| **Three.js docs + examples** (threejs.org) | Docs | The 3D library for the web | 🟡 |
| **React Three Fiber docs** (docs.pmnd.rs) | Docs | Three.js the React way (fits your stack) | 🟡 |
| **Inigo Quilez** (iquilezles.org) + **Shadertoy** (shadertoy.com) | Articles/Playground | Raymarching, SDFs, space/blackhole shader math — the deep end | 🔴 |
| **WebGL Fundamentals** (webglfundamentals.org) | Tutorials | How the GPU pipeline actually works | 🟡 |
| **SimonDev** (YouTube) | Videos | Graphics + shader math made approachable | 🟡 |
| **GPU Gems** (NVIDIA, free online) + **"Real-Time Rendering"** (Akenine-Möller et al.) | Books | Reference-grade graphics theory | 🔴 |
| **3Blue1Brown — "Essence of Linear Algebra"** | Videos | The math behind all 3D/graphics | 🟢 |
| **Data viz:** Recharts docs · Apache ECharts docs · Mermaid docs (mermaid.js.org) · Amelia Wattenberger "Fullstack D3" | Docs/Course | Rendering the tutor's charts & diagrams | 🟢→🟡 |

### 7.4 Blender / 3D assets

For creating the 3D/animated assets that feed the cosmic UI (export glTF → React Three Fiber).

| Resource | Type | Why | Level |
|---|---|---|---|
| **Blender Guru — "Donut Tutorial"** (Andrew Price, YouTube) | Video series | The universal Blender starting point | 🟢 |
| **Blender Manual** (docs.blender.org) + official "Blender Fundamentals" | Docs/Videos | Reference + structured basics | 🟢 |
| **Grant Abbitt** (YouTube) | Videos | Friendly, project-based modeling | 🟢 |
| **CG Cookie** (cgcookie.com) | Courses | Structured Blender curriculum | 🟡 |
| **Polygon Runway** (YouTube) | Videos | Stylized 3D (fits a modern UI aesthetic) | 🟡 |
| **Blender Geometry Nodes** (e.g., Erindale on YouTube) | Videos | Procedural/abstract assets (great for sci-fi UI) | 🔴 |
| **gltfjsx** + Three.js Journey's Blender chapter | Tool/Course | The exact Blender → glTF → R3F pipeline you'll use | 🟡 |

### 7.5 Backend / Infra / DevOps (to *control* & self-host the system)

| Resource | Type | Why | Level |
|---|---|---|---|
| **FastAPI docs** (fastapi.tiangolo.com) | Docs | Your backend framework | 🟢 |
| **SQLModel / SQLAlchemy docs** | Docs | DB models/queries | 🟡 |
| **PostgreSQL Tutorial** + **Hussein Nasser** (YouTube) | Docs/Videos | The DB + backend-engineering fundamentals | 🟡 |
| **Docker docs** + **Bret Fisher "Docker Mastery"** | Docs/Course | Containerizing every service | 🟡 |
| **Kubernetes (kubernetes.io) + Helm**; **TechWorld with Nana** (YouTube) | Docs/Videos | Enterprise self-host packaging (Phase 6) | 🔴 |
| **Caddy / Nginx** docs | Docs | Reverse proxy + TLS for the self-host bundle | 🟡 |
| **OWASP Top 10** + **The Copenhagen Book** (auth) | Reference | Security + auth done right (table stakes for enterprise) | 🟡 |
| **Prometheus + Grafana**; **OpenTelemetry** | Docs | Observability for the operable, sellable system | 🟡 |
| **NVIDIA CUDA basics** + vLLM/SGLang deployment guides | Docs | Running models on GPUs | 🔴 |

### 7.6 Math foundations (optional but empowering)

- **3Blue1Brown** — *Essence of Linear Algebra* + *Essence of Calculus* + *Neural Networks*. 🟢
- **"Mathematics for Machine Learning"** (Deisenroth, Faisal, Ong) — free PDF. 🟡

---

## 8. Suggested Learning Order

You don't need all of it at once. Map learning to the build phases so each thing you learn is immediately useful:

| When | Learn | So you can |
|---|---|---|
| **Now (Phase 1)** | React/Next.js + Tailwind + Motion + Refactoring UI | Confidently edit every screen and make it enterprise-grade |
| **Phase 2** | FastAPI + SQLModel + Postgres | Design the exam/subject/question domain model |
| **Phase 3** | Karpathy "Zero to Hero" → RAG papers → vLLM/SGLang + Outlines | Own and operate the open-source LLM core |
| **Phase 3 (parallel)** | The Book of Shaders → Three.js Journey → Blender Donut | Control the cosmic graphics + build the visual renderer |
| **Phase 4–5** | OWASP/auth + Razorpay/Stripe docs + Kill Bill/Lago | Build bulletproof email + payment verification |
| **Phase 6** | Docker → Kubernetes/Helm + Prometheus/Grafana | Package and sell it as a self-hostable enterprise product |

**Minimum to "understand the whole thing":** Karpathy's series (LLM), the RAG original paper, The Book of Shaders (graphics), React + Next + Tailwind (UI), FastAPI + Postgres + Docker (backend/infra). Everything else is depth.

---

## 9. Open Decisions & Risks

| Decision / risk | Notes |
|---|---|
| **Which OSS model?** | Qwen2.5/3 vs Mistral/Mixtral vs DeepSeek. Decide on quality-per-GPU for Indian-exam content. All Apache-2.0/MIT. |
| **GPU hosting** | Self-hosting a 70B needs real GPUs. Decide: own hardware vs rented GPU (RunPod/Lambda/Vast) vs a smaller model. This is the main cost/effort driver. |
| **Email path** | True self-host (Postal/Plunk + deliverability work) vs pragmatic relay (SES/Resend). Build the adapter either way. |
| **Payment region** | Razorpay (India-first) vs Stripe (global). Start Razorpay. |
| **Billing engine** | Custom entitlement vs Kill Bill/Lago. Custom is faster now; Kill Bill is more enterprise-credible. |
| **Count contract** | Schema can't enforce "exactly N" — needs prompt + validation + retry (already a known issue). |
| **Next.js 16** | Breaking changes vs training data — always check `node_modules/next/dist/docs/` before non-trivial Next work. |

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **RAG** | Retrieval-Augmented Generation — fetch relevant text, then have the LLM answer grounded in it (with citations). |
| **vLLM / SGLang** | Open-source servers that run an LLM and expose an OpenAI-compatible API. |
| **Grammar-constrained decoding** | Forcing the model's output to match a schema/grammar at the token level (valid JSON guaranteed). |
| **PSP** | Payment Service Provider (Razorpay, Stripe) — processes card/UPI payments. You can't self-host one. |
| **Entitlement** | The record that says "this user has Plus until date X." |
| **Idempotency** | Same operation applied twice has the same effect as once (critical for webhooks/payments). |
| **HMAC** | Keyed hash used to verify a webhook/callback genuinely came from the PSP. |
| **SPF/DKIM/DMARC** | DNS records that make your emails land in inboxes, not spam. |
| **glTF** | The standard format for shipping 3D models from Blender to the web. |
| **SDF / raymarching** | Shader techniques used to render things like a blackhole procedurally on the GPU. |

---

_This is a living document — update it as phases complete. Cross-references: the project memory (`project-direction.md`, `project-architecture.md`, `pending-work.md`) holds the same facts in short form for session continuity._
