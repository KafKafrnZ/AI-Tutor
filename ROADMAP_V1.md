# Ascend AI: the plan to a finished v1

**Written 2026-11-27.** This replaces the "Suggested order" in [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) and turns
the README's known-problems table into milestones with exit criteria. The long-term aim is a production-quality,
paid SaaS. This file covers v1: **the version a stranger could pay for and trust.**

## Time rules

This is leisure work. The main study plan comes first.

| Slot | Hours | What fits |
|---|---|---|
| Mon-Fri 22:00-24:00 | 2 h × 5 = 10 h | one PR-sized coding task per evening |
| Saturday, one block | about 4 h | longer work: corpus curation, labelling, deploys |
| Sunday | **none** | belongs to the main plan (recall, mock exam, capstone) |

About **14 h a week**.

1. **Never take hours from the main plan.** A missed slot is skipped, not made up.
2. **Exam weeks of the main plan:** no AI-Tutor work that week (the G0 exam is about mid-January 2027).
3. **Sleep wins.** If 22:00-24:00 would cut sleep below 7.5 h in bed, end at 23:30.
4. **Every session ends with a commit** (tests passing) and one line in the log at the bottom of this file. A
   session that ends mid-task leaves a `WIP:` note saying where to start next time.
5. **One milestone open at a time.** Its PR is merged before the next one starts.

## What "v1 finished" means

All of these hold, each shown by a script or a check anyone can run:

- [ ] Every corpus item has a source or is marked synthetic; ingestion rejects duplicates and unsourced items.
- [ ] A labelled test set of at least 100 questions (at least 30 of them unanswerable) runs in CI and reports hit@5,
      MRR and abstention with 95% confidence intervals.
- [ ] Answers cite chunk ids; a cited id that was not in the context fails the answer. Faithfulness on a labelled set
      is measured and published in the README.
- [ ] Quiz answer keys are checked independently before a student sees them.
- [ ] Latency (p50, p95), tokens and cost per answer are logged; there is a cost ceiling per user per day.
- [ ] Sign-up email, password reset and payment (Razorpay, UPI) work end to end on a real inbox and a real test payment.
- [ ] Privacy policy and terms are online (India's DPDP Act 2023 applies to student data).
- [ ] Deployed, with error tracking, an uptime check, database backups and a restore that has been tested once.
- [ ] 10 real students used it for 2 weeks; their feedback is written down and the top 3 problems are fixed.

## Milestones

The hours are estimates; the sum is about **165 h, which is about 12 weeks at 14 h/week**, or about **16 weeks
with the usual overrun**. Starting Mon 2026-11-30, with the G0 exam week off, that is **late March 2027**.

| # | Milestone | Exit criterion (how we know it is done) | Est. h | Slot type |
|---|---|---|---|---|
| **V0** | Merge `fix/rag-trust-basics`. Push the two Omen-only commits (`feat/billing-quota-enforcement`) so nothing lives on one disk | PR merged, CI green; both commits visible on GitHub | 3 | weekday |
| **V1** | **Corpus.** Item schema with `source` / `synthetic`; ingestion that fails on near-duplicates and unsourced items; 300-500 real items. Sources: official papers whose terms of use you have checked, plus clearly marked synthetic items (reuse the reviewed govexam CoT items) | ingestion run on the new corpus passes; 0 duplicates; 100% have a source or a synthetic flag | 35 | Saturday (curation), weekday (code) |
| **V2** | **Labelled eval.** 100+ hand-labelled questions, 30+ unanswerable; bootstrap confidence intervals; runs in CI | baseline numbers committed, reproducible by one command | 12 | Saturday (labelling) |
| **V3** | **Retrieval.** BM25 written by hand + reciprocal rank fusion with the embedding search; reranker behind a flag; recalibrate the threshold | each change is kept only if it beats the V2 baseline (paired test); numbers in the README | 12 | weekday |
| **V4** | **Grounding.** Chunk-id citations, cited-id check, answer-level "does this passage answer it" check, abstention; faithfulness on a labelled answer set, with the LLM judge checked against 50 of your own labels | faithfulness and abstention measured and published | 20 | weekday + Saturday |
| **V5** | **Reliability**, split out of `wip/2026-09-21-billing-quota-ui` in small PRs (backup model, vector-store timeout, stream replay, structured quiz output + independent answer check) | one PR each, with tests; the wip branch is retired | 20 | weekday |
| **V6** | **Cost.** Per-request logging (retrieval time, time to first token, tokens, cost); answer cache; output caps by question type; daily cost ceiling | a week of logs gives p50/p95 latency and cost per answer; cache hit rate measured | 10 | weekday |
| **V7** | **Accounts and money.** Transactional email (Resend or SMTP); quotas + Razorpay from the wip branch, reviewed; `/billing`; privacy policy and terms | real inbox gets verify + reset mail; one real test payment changes the plan; legal pages linked | 25 | weekday + Saturday |
| **V8** | **Deploy and operate.** Fresh deploy (the old Vercel/Railway ones are gone); Sentry, uptime check, nightly database backup, one restore drill | the app is up at a public URL; restore drill logged | 10 | Saturday |
| **V9** | **Beta.** Mobile and accessibility pass, Playwright login-to-answer test, a small load test; 10 students for 2 weeks | feedback written down; top 3 problems fixed | 18 | mixed |

**Only you can do these (they block the milestone named):** decide and check the corpus sources and their terms (V1);
create the Razorpay account and complete its KYC (V7); provide the LLM API key and pick the provider (V4, V6);
choose the hosting accounts (V8); find the 10 beta students (V9).

## After v1 (not planned yet, on purpose)

Revenue, pricing, marketing and growth decide what the project is worth; code alone does not. Plan that once V9's
feedback is in. Fine-tuning (embedding model first, then the generator) comes after V3 and V4 have numbers to beat.
Study notes for all of this: `study/PhMs/08_Reading/31_AI_Tutor_Trust_Accuracy_Cost.md` in the study repo.

## How a 2-hour evening runs

1. 5 min: read the last log line below and the open milestone's checklist.
2. 100 min: one task small enough to finish and test tonight.
3. 15 min: tests pass → commit → one log line. If not finished: commit as `WIP:` and write where to resume.

## Log

| Date | Milestone | Done | Next |
|---|---|---|---|
| 2026-11-27 | (pre-V0) | `fix/rag-trust-basics`: embedding bug, threshold, dedupe, prompt grounding, quiz validation, smoke eval; 129 tests pass | V0: review and merge the PR |
