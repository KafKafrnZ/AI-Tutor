# Production readiness — what is still left

**Date:** 2026-08-25  
**Branch:** `gemini/p-01-email-env-names` (Phase 1 hardening)  
**Status:** Safe to create an account and run CI. **Not** ready to charge strangers or call this a finished product.

This file is the remaining work after Phase 1. Done items live in `FIXES.md` and `MEMORY.md`. Do not start billing (Phase 2) until this branch is merged to `main` and the GitHub required check **Gate** is green.

---

## What Phase 1 already closed

| Area | What shipped |
|---|---|
| Email config | `EMAIL_*` canonical; `SMTP_*` deprecated fallback |
| Boot | `backend/scripts/start.sh`: migrate → ingest PYQs → uvicorn |
| Preview auth | Server-only `PREVIEW_AUTH`; production + flag throws |
| CSRF | Fail-closed in production; exact origin match |
| Refresh tokens | SHA-256 equality lookup; unique partial index |
| Health | `GET /health` reports `llm` without spending tokens |
| Signup | Email verification defaults **on** in production |
| CI | One workflow `.github/workflows/ci.yml`; require check **Gate** |
| BFF errors | Fetch failure → `502 BACKEND_UNREACHABLE`; cookies still forwarded |

That is **hardening**, not a commercial product.

---

## Definition of “shippable”

A stranger can:

1. Pay (UPI / cards) and get a plan that actually limits LLM spend  
2. Sign up, verify email, log in, reset a password, and receive the mail  
3. Ask the tutor and get answers grounded in a real, evaluated corpus  
4. Not take the site down with one chat tab or one stolen cookie  
5. Use the app on a phone without a broken layout or a 3D canvas melting the battery  
6. You get paged when `/health` or Sentry fires — not when a student tweets

Until all of **Must ship** below is done, do not run ads or take money.

---

## Must ship (blocks taking money)

### 1. Billing and entitlements

`User.plan` exists and does nothing. Every verified user is unlimited Groq spend.

- Enforce daily quotas per plan (`free` / `plus` / `pro`) on `/ask`, `/ask/stream`, mock starts, revision-plan  
- Redis required in production (already fatal only when `WEB_CONCURRENCY > 1`)  
- **Razorpay** subscriptions + signed webhooks (India first: UPI). Never trust `plan` from the client  
- `/billing` page and a plan pill on `/me`  
- See Phase 2 in the internal plan: P-11 … P-14

### 2. Transactional email that actually arrives

Verification and reset tokens are created even when SMTP is missing (prod logs an error and boots). That is a lockout.

- Configure `EMAIL_*` **or** add Resend (`RESEND_API_KEY`)  
- `REQUIRE_EMAIL_VERIFICATION=true` in production (now the default if unset)  
- Confirm a real inbox receives verify + reset mail before launch

### 3. Production deploy, not a laptop

- Railway: volume mounted, `RAILWAY_VOLUME_MOUNT_PATH` / `RAG_CHROMA_PATH` set, `REDIS_URL` set, `ALLOWED_ORIGINS` = the Vercel origin  
- Vercel: `BACKEND_API_URL` = Railway URL; **never** `PREVIEW_AUTH`  
- Branch protection on `main`: require check **Gate**  
- Sentry DSNs on both sides (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`)  
- Uptime check on `GET /health` (must include `"database":"connected"`)

### 4. Retrieval that is a tutor, not 200 JSON rows

- Offline RAG eval (`hit@5`) before changing the index  
- Timeout on Chroma queries (F-07) so one hang does not stall the worker  
- Fallback LLM model on 429/5xx after retries (F-05)  
- Grow the corpus with **cited or clearly synthetic** items; do not invent “real UPSC papers”

---

## Should ship (blocks calling it finished)

| Item | Why |
|---|---|
| Playwright cookie E2E (F-16) | Login → dashboard is the product. Unit tests do not prove cookies. |
| SSE reconnect on `/tutor` (F-12) | Mid-stream drops look like a dead tutor. |
| Client + server form validation (F-09) | Signup/login errors must be human, not a raw 422. |
| Empty/error states (F-10) | Dashboard/progress with no tests must not be a blank glass panel. |
| Mobile + a11y (F-18) | Sidebar, mock test, voice UI, `/explore` under `prefers-reduced-motion`. |
| Chroma / DB timeouts (F-07, F-06) | Sync SQLAlchemy + unbounded Chroma is the next outage. |

---

## Nice later (do not start these before billing)

- Game UI remaining pass (F-14)  
- Background mock scoring queue (F-15)  
- Full async SQLAlchemy (F-06) — high breakage; do after quotas  
- Archive `REFERENCE_PROMPTS.txt` (F-17)  
- Optional LLM verifier stream (F-19)  
- pgvector dual-write (keep Chroma until eval says otherwise)  
- PostHog (no PII / no question text in events)  
- CSP tighten (`unsafe-inline` / `unsafe-eval`)  
- Replace regex prompt-injection theatre with output-side policy  

---

## Explicitly out of scope until there is revenue

- Kubernetes, microservices, Clerk/Auth0  
- Stripe as the primary India processor (Razorpay first)  
- Rewriting Next.js 16 `proxy.ts` back to `middleware.ts`

---

## Suggested order after this PR merges

1. Merge this branch. Turn on required check **Gate**. Redeploy Railway + Vercel with the env list in `DEPLOY.md`.  
2. Phase 2: quotas + Redis-mandatory-in-prod + Razorpay + working email.  
3. Phase 3: RAG eval + Chroma timeout + fallback model + corpus.  
4. Phase 4: Playwright, SSE retry, forms, empty states, mobile a11y.  
5. Then charge a real user.

Owner checklist for the first paying user: `DEPLOY.md` §4 plus **Must ship** §1–3 above, all green.
