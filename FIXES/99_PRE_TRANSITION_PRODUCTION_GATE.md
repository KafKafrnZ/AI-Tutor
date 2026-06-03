# Pre-Transition Production Gate

This checklist defines what must be true before the current IBPS SO AI system transitions into the broader GovExam all-rounder AI tutor platform.

The goal is not to finish the entire enterprise roadmap before transition. The goal is to make the current system stable, secure, observable, recoverable, and modular enough that the next phase does not inherit prototype debt.

## Readiness Target

Before transition, the system should be at the verge of production/enterprise readiness:

- Stable enough for controlled production or staging use.
- Secure enough for real users under limited scale.
- Observable enough to debug failures without guessing.
- Modular enough to expand beyond IBPS SO.
- Reliable enough that AI/RAG quality issues are measurable, not mysterious.
- Documented enough that setup, deployment, and recovery are repeatable.

Enterprise-grade monetization, admin operations, analytics depth, multimodal tutoring, and multi-exam intelligence can continue as roadmap work, but the foundation below must be closed first.

## Gate 1: Runtime Stability

- [ ] Backend test suite passes from a clean checkout.

  The backend should start and pass tests without relying on hidden local state, manual DB edits, or old generated files.

- [ ] Frontend build passes without TypeScript, lint, or bundling failures.

  A production build must be possible before any roadmap expansion begins.

- [ ] Backend starts cleanly with documented environment variables.

  Missing configuration should fail with clear errors, not obscure stack traces.

- [ ] Frontend starts cleanly against the backend API.

  The user-facing app should not require manual code edits, hardcoded localhost changes, or undocumented setup.

- [ ] Critical routes return expected responses.

  Verify auth routes, tutor routes, RAG routes, PYQ/mock routes, health routes, and error log routes.

- [ ] No known crash-on-load screens remain.

  Any page that can blank-screen the app must be fixed before transition.

- [ ] No known streaming hang remains in tutor/chat flows.

  Streaming failures should end gracefully with a useful message and recoverable UI state.

## Gate 2: Authentication And User Safety

- [ ] Register, login, logout, refresh/session check, and protected-route redirects work end to end.

  This is the minimum real-user auth loop.

- [ ] Auth errors are understandable to non-technical users.

  Validation errors, bad credentials, expired sessions, and server failures should produce clear frontend messages.

- [ ] Cookies are httpOnly and environment-aware.

  Production should use secure cookies. Local development should still work without HTTPS when configured that way.

- [ ] CORS is locked to known frontend origins.

  Broad wildcard CORS should not be used for real deployments.

- [ ] Login and registration endpoints have rate limiting.

  This is required to reduce brute force, spam, and accidental abuse.

- [ ] Tutor and AI-heavy endpoints have rate limiting or quota controls.

  AI calls are expensive and vulnerable to abuse. Even simple per-user or per-IP limits are better than open access.

- [ ] Password policy is enforced consistently.

  Backend validation should be authoritative. Frontend validation should help users but not replace backend checks.

- [ ] Sensitive user data is not logged.

  Logs must not contain passwords, raw tokens, secret headers, or full personal payloads.

## Gate 3: API And Error Handling

- [ ] All public API endpoints return predictable error shapes.

  Frontend UX becomes much easier when API errors are structured consistently.

- [ ] Pydantic validation errors are normalized for frontend display.

  Users should not see raw nested validation internals.

- [ ] Request body size limits exist for user and AI inputs.

  Large payloads can cause cost spikes, latency problems, or memory pressure.

- [ ] LLM prompt/input length limits are enforced server-side.

  The backend must guard model calls even if the frontend already limits input.

- [ ] Error payloads are bounded and sanitized.

  Error logs should keep enough debugging context without storing massive or sensitive content.

- [ ] API response models are explicit for user-facing routes.

  This reduces accidental data leakage and keeps frontend contracts stable.

## Gate 4: Database And Data Integrity

- [ ] Alembic migrations are the only schema-management path.

  Runtime `init_db` style schema mutation should not be used for production-like environments.

- [ ] A fresh database can be created using migrations only.

  This proves new environments can be reproduced.

- [ ] Existing local/dev data can be migrated without manual repair.

  If manual repair is still needed, document it and finish the migration before transition.

- [ ] Database health check verifies real connectivity.

  A simple app-is-running check is not enough for readiness.

- [ ] Connection pooling settings are configured for the target environment.

  Pool size, overflow, timeout, and recycle behavior should be intentional.

- [ ] Core tables have appropriate constraints.

  Users, sessions, attempts, questions, errors, and content metadata should not accept impossible states.

- [ ] Seed/demo data is separated from production data.

  Production startup should not silently insert mock or test data.

- [ ] Backup and restore process is documented.

  Even a simple manual process is acceptable before scale, but it must exist.

## Gate 5: AI Tutor Reliability

- [ ] Tutor endpoints handle provider failures gracefully.

  Model timeout, API failure, invalid response, or empty response should not break the user session.

- [ ] Streaming responses have clear completion and error states.

  The UI should know whether a stream completed, failed, or was interrupted.

- [ ] User input is validated before model calls.

  Empty, oversized, abusive, or malformed input should be rejected before cost is incurred.

- [ ] Prompt construction is centralized enough to audit.

  Scattered prompt strings make behavior hard to improve during the GovExam transition.

- [ ] Basic tutor regression prompts are documented.

  Keep a small set of expected questions and quality checks for reasoning, citation usage, exam relevance, and refusal behavior.

- [ ] AI latency and failure rates are logged.

  Without these, quality and cost problems become guesswork.

## Gate 6: RAG Quality And Content Grounding

- [ ] RAG corpus paths are anchored and environment-safe.

  Retrieval should not depend on whichever directory the process was launched from.

- [ ] RAG loading is lazy or startup-safe.

  App startup should not fail mysteriously because content indexing is slow or unavailable.

- [ ] Retrieved context includes citation metadata.

  At minimum, include subject, topic/source, year when available, and chunk/document identity.

- [ ] Tutor prompt instructs the model how to use citations.

  The model should know when to cite, when to say context is missing, and when not to invent details.

- [ ] No-context fallback is implemented.

  If retrieval returns nothing useful, the tutor should say so and answer cautiously or ask for clarification.

- [ ] Retrieval events are logged.

  Log query, selected chunk IDs, metadata, score if available, and whether context was injected.

- [ ] RAG corpus coverage is explicitly labeled as limited.

  Until the corpus is much larger, the app should not imply full syllabus authority.

- [ ] Content ingestion plan exists for the multi-exam roadmap.

  Before transition, define how PDFs, PYQs, syllabus docs, notes, and metadata will enter the system.

## Gate 7: Frontend UX Baseline

- [ ] Auth pages show friendly validation and server errors.

  This is essential for real users and reduces support burden.

- [ ] Protected routes do not flash broken or unauthorized content.

  Loading, unauthenticated, and authenticated states should be distinct.

- [ ] Tutor UI handles loading, streaming, retry, and failure states.

  A failed model call should not trap the user.

- [ ] ErrorBoundary exists around major app areas.

  One frontend exception should not collapse the entire user experience.

- [ ] Mobile sidebar/navigation works across core pages.

  The app must be usable on common mobile widths before expansion.

- [ ] Timers, mocks, and exam flows survive navigation where expected.

  User progress should not disappear because of incidental UI movement.

- [ ] User-facing hardcoded prototype data is removed or clearly marked.

  Mock content is acceptable only when the UI clearly treats it as sample/demo data.

## Gate 8: Observability And Operations

- [ ] Structured logging is enabled across backend routes.

  Logs should include route, method, status, latency, and request ID.

- [ ] Request IDs are generated and returned in responses.

  This makes frontend bug reports traceable to backend logs.

- [ ] AI calls log provider, model, latency, success/failure, and sanitized error category.

  Costly paths need stronger visibility than ordinary routes.

- [ ] Database errors are logged with useful context.

  Logs should identify operation class and failure type without exposing sensitive payloads.

- [ ] Frontend runtime errors have a reporting path.

  This can start as a backend endpoint or local logging path, but silent client failures are not acceptable.

- [ ] Health and readiness checks are distinct.

  Health means the process is alive. Readiness means dependencies like DB and required config are usable.

- [ ] Deployment logs are reviewed after a clean boot.

  Warnings that indicate misconfiguration should be fixed, not normalized.

## Gate 9: Configuration And Deployment

- [ ] `.env.example` or equivalent config documentation is complete.

  Every required variable should have a name, purpose, and example value format.

- [ ] Development, staging, and production config expectations are separated.

  Do not rely on one ambiguous environment setup for everything.

- [ ] Secrets are never committed.

  Verify `.gitignore` and scan for accidental keys, tokens, or credentials.

- [ ] Production debug mode is disabled.

  Stack traces and debug features should not be exposed to users.

- [ ] Allowed origins, cookie settings, token expiry, and database URL are environment-driven.

  These should not require source-code edits per deployment.

- [ ] Static assets and frontend API base URL are production-safe.

  No hardcoded dev-only API URL should remain in the production build path.

- [ ] One documented deployment path exists.

  Whether Docker, VPS, Render, Railway, Vercel frontend plus backend host, or another setup, the path should be repeatable.

## Gate 10: Testing Minimum

- [ ] Backend unit tests cover auth validation, API errors, RAG fallback, and tutor input limits.

  These are the highest-risk areas in the current scope.

- [ ] Backend integration tests cover login plus one protected API call.

  This catches auth middleware/cookie regressions.

- [ ] Database migration test runs against an empty database.

  This proves environment reproducibility.

- [ ] Frontend tests or smoke checks cover auth and tutor critical path.

  Even lightweight coverage is better than relying only on manual clicking.

- [ ] Manual QA checklist exists for release candidates.

  Include desktop, mobile, auth, tutor, RAG citation, mock/PYQ, and failure-state checks.

- [ ] Known unsupported cases are documented.

  A limitation is acceptable before transition if it is explicit and not silently harmful.

## Gate 11: Modularization For GovExam Transition

- [ ] IBPS-specific logic is identified and labeled.

  Before building an all-rounder tutor, know what is generic and what is exam-specific.

- [ ] Exam metadata model is drafted.

  Define fields such as exam code, exam name, subjects, syllabus areas, stages, question types, language, and source metadata.

- [ ] Tutor prompt accepts exam context as a variable.

  The system should not hardcode IBPS SO assumptions deep inside tutor logic.

- [ ] Content retrieval can be filtered by exam/subject/year/source.

  Multi-exam RAG requires scoped retrieval from the start.

- [ ] Frontend route/navigation structure can support multiple exams.

  Avoid transition work that forces a full routing rewrite later.

- [ ] User progress model can eventually support multiple exams.

  Attempts, bookmarks, weak areas, history, and plans should not assume only one exam forever.

- [ ] Admin/content-management boundary is sketched.

  Even if not built yet, define where content upload, review, tagging, and publishing will live.

## Gate 12: Security Review Before Transition

- [ ] Run dependency vulnerability checks.

  Use the available package-manager audit tools and review critical/high issues.

- [ ] Review authentication middleware manually.

  Confirm protected endpoints are actually protected and public endpoints are intentionally public.

- [ ] Review authorization assumptions.

  A logged-in user should not be able to access another user's attempts, logs, or private data.

- [ ] Review upload/file handling if present.

  File paths, file size, extension, MIME type, and storage location need controls.

- [ ] Review logging for sensitive data.

  Error traces and AI prompts can accidentally contain private user content.

- [ ] Review AI abuse controls.

  Add input limits, rate limits, timeout handling, and refusal behavior for unsafe or irrelevant use.

- [ ] Add security headers in production responses.

  Include sensible defaults for content type, framing, referrer policy, and browser protections.

## Gate 13: Product Readiness Boundary

- [ ] The app clearly states its current exam/content scope.

  Users should know when they are using IBPS SO content versus a future broader tutor.

- [ ] The app does not overclaim RAG/content completeness.

  This matters for trust, especially in exam preparation.

- [ ] Static mocks and sample questions are labeled or replaced.

  Hardcoded practice data should not masquerade as a full question bank.

- [ ] Critical user journeys are coherent.

  A new user should understand how to start learning, ask the tutor, practice, and review errors.

- [ ] Support/recovery path is defined.

  At minimum, define how a user reports a bug or recovers from account/session issues.

## Gate 14: Enterprise Roadmap Handoff

These items do not need to be fully implemented before transition, but they must be explicitly moved into the GovExam roadmap so they are not confused with unresolved bugs.

- [ ] Multi-exam architecture.
- [ ] Larger verified RAG corpus.
- [ ] Content ingestion pipeline.
- [ ] Admin dashboard.
- [ ] Role-based access control.
- [ ] Subscription/monetization.
- [ ] Payment provider integration.
- [ ] Study plans and spaced repetition.
- [ ] Analytics dashboards.
- [ ] Multilingual support.
- [ ] Voice and multimodal tutor support.
- [ ] Advanced test engine.
- [ ] Human review/content moderation workflow.
- [ ] Production monitoring/alerting.
- [ ] Formal privacy policy and terms.
- [ ] Data retention and deletion workflows.

## Definition Of Done Before Transition

The transition can begin when all of the following are true:

- [ ] No known critical runtime bugs remain.
- [ ] Auth and protected routes work end to end.
- [ ] Tutor and RAG flows fail gracefully.
- [ ] Backend and frontend can be built/tested from a clean setup.
- [ ] Database migrations can recreate schema from scratch.
- [ ] Rate limits and input limits exist on sensitive/expensive endpoints.
- [ ] Logs are structured enough to diagnose real failures.
- [ ] Required deployment/config variables are documented.
- [ ] The current IBPS-specific scope is clearly separated from future GovExam scope.
- [ ] Enterprise roadmap gaps are tracked as roadmap items, not hidden production defects.

## Final Transition Statement

Use this wording only after the checklist is complete:

> The current IBPS SO AI tutor is production-stabilized for its current scope and ready to serve as the foundation for the GovExam all-rounder AI tutor transition. It is not yet feature-complete as an enterprise GovExam platform, but the remaining gaps are roadmap expansion work rather than unresolved technical debt.
