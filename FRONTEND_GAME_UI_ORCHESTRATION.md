# Ascend AI Frontend Game UI/UX Orchestration

Date: 2026-06-09
Repo: `D:\AI\treasury\AI-Tutor`
Frontend: `frontend/`
Branch: `claude/pc-file-access-mnxju`

## Executive Mandate

Transform every Ascend AI frontend surface into a polished "PC gaming plus future AI" study operating system. The result must feel intense, useful, premium, and study-safe: cinematic when it helps motivation, quiet when the user needs focus, and always faithful to existing product logic.

This is a redesign and experience pass, not a rewrite. Preserve auth, proxy behavior, tutor SSE streaming, agent stages, Zustand state, VoiceInput, ThreeDExplorer integrations, mock submission/scoring, RAG citations, revision plans, tests, accessibility fixes, and deployment behavior.

## Non-Negotiable Engineering Rules

1. Read `MEMORY.md` before touching files.
2. Read `REFERENCE_PROMPTS.txt` before assigning or implementing work.
3. Before editing any Next.js App Router file convention, read the relevant local Next 16 docs under:
   `frontend/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`
4. Use token classes and CSS variables from `frontend/styles/tokens.css`.
5. Do not introduce raw semantic Tailwind color classes such as `text-violet-400`, `bg-amber-500`, `text-rose-400`, `bg-emerald-500`, or `focus:ring-violet-500`.
6. Do not copy game logos, copyrighted art, UI screenshots, named character likenesses, or branded assets. Use original art direction inspired by the mapped games.
7. Respect `prefers-reduced-motion`. Reduced motion must still look premium through layout, color, typography, contrast, and copy.
8. Keep keyboard navigation excellent. Interactive elements must be real `button`, `a`, input, select, or equivalent accessible controls.
9. Every route must pass:
   - `npm test`
   - `npm run lint`
   - `npm run build`
   - Desktop and mobile visual inspection
   - No CSP console violations
10. Push after each completed work package.

## Canonical Page Mapping

| Surface | Game Direction | Product Translation |
| --- | --- | --- |
| `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email` | Cyberpunk 2077 style neon city | Public entry, neural login, exam path onboarding |
| `/dashboard` | Witcher 3 war room and notice board | Daily contracts, revision plan, model medallion, fast travel |
| `/tutor` | Portal 2 test chamber | Chamber prompts, core stages, clean lab UI, dry intelligent microcopy |
| `/explore` | Elden Ring plus No Man's Sky | 3D knowledge realm, sites of grace, syllabus constellations |
| `/practice`, `/tests` | DOOM Eternal / ULTRAKILL | Fast drills, arena HUD, streak pressure, rank feedback |
| `/mock-tests`, `/mock-tests/[id]`, `/mock-tests/[id]/results` | Dark Souls / Elden Ring / Sekiro posture | High-stakes trial, bonfire checkpoints, hollowing from negative marks |
| `/progress` | StarCraft II / Civilization VI | Tech tree, command center, ladder, build orders |
| `/mistakes`, `/error-log` | Hades / Bloodborne | Run history, shades, boons, repeat-offender curses |
| Profile, settings, companion switcher | Deus Ex plus ripperdoc lab | LLM companion implants, tradeoffs, install/equip/overclock |
| Loading, error, not-found, mobile nav | Parent route universe or shared Neuro-OS | In-universe fallback states, no blank flashes |

## Global Experience System

Build one shared game shell that can shift tone by route without fragmenting the app:

- **Neuro-OS HUD**: player name, streak, mastery level, active companion, route hotkeys, focus state.
- **Universe Theme Context**: route-derived theme object with labels, accent token, surface treatment, motion vocabulary, and empty/error copy.
- **Game Primitives**:
  - `GameButton`
  - `GameCard`
  - `HudBar`
  - `QuestToast`
  - `RouteLoading`
  - `InWorldEmptyState`
  - `GameStat`
  - `CompanionBadge`
  - `PauseMenu`
- **Motion Grammar**:
  - Cyberpunk: scanline, glitch pulse, neon hover lock.
  - Witcher: parchment reveal, medallion pulse, contract pin.
  - Portal: chamber slide, aperture ring, calibrated focus.
  - Elden: grace beam, fog reveal, rune activation.
  - Doom: hitstop, threat lock, rank burst.
  - Souls: bonfire ember, posture crack, victory flare.
  - StarCraft: command panel snap, tech unlock, radar sweep.
  - Hades: boon flip, shade rise, escape attempt ledger.
  - Deus Ex: implant slot, retinal scan, overclock glow.
- **Copy Rules**:
  - Replace generic text like "Submit", "Dashboard", "No data", and "Try again" with route-specific language.
  - Never let flavor hide meaning. The user must understand the action instantly.
  - Serious exam states must remain respectful. Failure copy should be dramatic, not insulting.

## Parallel Workstream Assignments

### LLM-A: Design System Architect

Owner: global shell, tokens, reusable components, layout contracts.

Read first:
- `frontend/styles/tokens.css`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/app/AppLayout.tsx`
- `frontend/components/layout/Sidebar.tsx`
- `frontend/components/layout/StatBadge.tsx`

Deliver:
- Extend tokens with route universe variables.
- Create shared game primitives.
- Theme AppLayout and mobile navigation.
- Add reduced-motion variants.
- Preserve current routing and auth behavior.

Acceptance:
- No raw semantic Tailwind color classes.
- Existing pages render with the new shell before page-specific work lands.
- Keyboard tab order is clean in the shell.

### LLM-B: Public/Auth Cyberpunk Lead

Owner: landing and all auth surfaces.

Read first:
- `frontend/app/page.tsx`
- `frontend/components/auth/AuthCard.tsx`
- `frontend/app/forgot-password/page.tsx`
- `frontend/app/reset-password/page.tsx`
- `frontend/app/verify-email/page.tsx`
- Relevant Next `page.md`, `loading.md`, and `error.md` docs before edits.

Deliver:
- Landing page as a neon exam command deck.
- Login/signup as neural access flows.
- Password validation UI remains enforced.
- Forgot/reset/verify states feel like account recovery in a secure city system.

Acceptance:
- API calls and auth redirects unchanged.
- Password validation still prevents weak passwords before network call.
- Mobile auth screens remain easy to use.

### LLM-C: Tutor Portal Chamber Lead

Owner: `/tutor`, tutor loading, SSE error states, voice, agent stages.

Read first:
- `frontend/app/tutor/page.tsx`
- `frontend/app/tutor/loading.tsx`
- `frontend/components/VoiceInput.tsx`
- `frontend/lib/sse.ts`
- `frontend/tests/sse-parser.test.ts`
- Next `page.md`, `loading.md`, and `error.md`.

Deliver:
- Portal-inspired clean chamber UI.
- Existing agent stages reframed as lab/core stages.
- Stream drop, retry, partial response, citations, and VoiceInput remain intact.
- Suggested prompts become test chamber cards.

Acceptance:
- SSE parser tests still pass.
- No streaming regressions.
- No blank Suspense flash.
- Console has no CSP violations.

### LLM-D: 3D Explore Realm Lead

Owner: `/explore` and `ThreeDExplorer`.

Read first:
- `frontend/app/explore/page.tsx`
- `frontend/components/ThreeDExplorer.tsx`
- Existing R3F/three dependencies in `frontend/package.json`.

Deliver:
- Elden-inspired knowledge realm without copying assets.
- Sites of grace as syllabus nodes.
- Fog, beams, readable labels, camera modes, and interaction affordances.
- Click actions link naturally into tutor or practice without breaking current props.

Acceptance:
- 3D scene is nonblank on desktop and mobile.
- Canvas remains interactive.
- Reduced motion lowers particle intensity.
- Build succeeds without R3F type errors.

### LLM-E: Practice And Mock Combat Lead

Owner: `/practice`, `/tests`, `/mock-tests`, `/mock-tests/[id]`, results.

Read first:
- `frontend/app/practice/page.tsx`
- `frontend/app/mock-tests/page.tsx`
- `frontend/app/mock-tests/[id]/page.tsx`
- `frontend/app/mock-tests/[id]/results/`
- `frontend/tests/scoring.test.ts`
- Next `page.md`.

Deliver:
- Practice as fast arena drills.
- Mock list and mock-taking as Souls-inspired trials.
- Results screen shows negative marking with dramatic but clear breakdown.
- Buttons remain accessible and keyboard operable.

Acceptance:
- All wrong answers still score floor `0.0`.
- Results show per-question marks, correct answer, explanation.
- No `alert()` calls.
- Existing submission endpoint unchanged.

### LLM-F: Progress And Mistake Meta-Game Lead

Owner: `/progress`, `/mistakes`, `/error-log`.

Read first:
- `frontend/app/progress/page.tsx`
- `frontend/app/mistakes/page.tsx`
- `frontend/app/error-log/page.tsx`

Deliver:
- Progress as command center and tech tree.
- Mistake locker as run history and boon/curse system.
- Repeat errors become clear priority targets.
- Empty states are in-universe and actionable.

Acceptance:
- Data fetches unchanged.
- Redirect from `/mistakes` remains correct if current behavior expects it.
- Tables/cards remain readable for long review sessions.

### LLM-G: Resilience, Error, And QA Lead

Owner: global error, not found, loading states, CI, browser verification.

Read first:
- `frontend/app/global-error.tsx`
- `frontend/app/not-found.tsx`
- `frontend/app/**/loading.tsx`
- `.github/workflows/frontend-ci.yml`
- Next `error.md`, `not-found.md`, `loading.md`.

Deliver:
- In-universe loading and error states.
- Honest global error copy.
- 404 links to public home.
- QA checklist execution after each package.

Acceptance:
- `npm test`, `npm run lint`, and `npm run build` pass.
- No auth redirect loops.
- No "team has been notified" copy unless real reporting is configured.

## Copy-Paste Master Prompt For Each LLM

Use this prompt as the first message for every assigned LLM, then append that LLM's workstream section above.

```text
You are one of several senior frontend agents redesigning Ascend AI.

Repo: D:\AI\treasury\AI-Tutor
Frontend: frontend/
Branch: claude/pc-file-access-mnxju
Framework: Next.js 16 App Router, Tailwind v4, Framer Motion

Mission:
Redesign your assigned frontend surfaces into a polished PC gaming plus future AI experience. Preserve all existing product behavior. You may transform layout, copy, motion, visual hierarchy, component skinning, empty states, loading states, and interaction polish. You may not break auth, SSE streaming, voice input, ThreeDExplorer contracts, mock scoring/submission, Zustand state, revision plans, proxy behavior, tests, or deployment.

Before code:
1. Read MEMORY.md.
2. Read REFERENCE_PROMPTS.txt.
3. Read the assigned source files.
4. Before editing any Next file convention, read the matching local doc in frontend/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/.
5. Read frontend/styles/tokens.css and frontend/app/globals.css.

Hard rules:
- Use existing design tokens and extend tokens.css when needed.
- Do not use raw semantic Tailwind colors like text-violet-400, bg-amber-500, text-rose-400, bg-emerald-500, or focus:ring-violet-500.
- Use accessible semantic controls.
- Respect prefers-reduced-motion.
- Do not copy copyrighted game assets, logos, characters, or UI screenshots. Create original interfaces inspired by the assigned game direction.
- Keep effects performant on mid-range hardware.
- Preserve all API paths, request bodies, response handling, and error handling unless your assignment explicitly says otherwise.

Design target:
The app should feel like a premium study operating system for government exam preparation: cinematic, tactile, fast, readable, and addictive. Every button, card, toast, empty state, loading state, and failure state should feel like a meaningful game action while remaining clear to a serious learner.

Verification:
Run npm test after your package if tests are affected.
Run npm run lint.
Run npm run build before handoff.
List any warnings, skipped checks, or known risks.
Commit with a clear message and push the branch.
```

## Integration Order

1. LLM-A lands design system primitives and route theme context.
2. LLM-G lands shared loading/error/not-found treatment.
3. LLM-B lands public/auth surfaces.
4. LLM-C lands tutor.
5. LLM-D lands explore.
6. LLM-E lands practice and mock tests.
7. LLM-F lands progress and mistakes.
8. Final integration pass resolves token drift, spacing, copy consistency, reduced motion, and visual regressions.

Do not let page teams invent conflicting primitives. If a page needs a new primitive, add it through LLM-A or submit it as a small extension to the shared design system.

## Final Acceptance Checklist

- All frontend routes have a game-specific treatment.
- Existing feature behavior is preserved.
- No raw semantic Tailwind color classes in `frontend/app` or `frontend/components`.
- `npm test` passes.
- `npm run lint` passes, or only pre-existing warnings are documented.
- `npm run build` passes.
- Browser console shows zero CSP violations on dashboard, tutor, practice, mock tests, progress, and auth.
- Keyboard users can navigate and activate every interactive control.
- Reduced motion users receive a stable, polished UI.
- Mobile screens use dynamic viewport heights where appropriate.
- The design feels cohesive as Ascend AI, not like unrelated skins stitched together.

## Engineering Manager Notes

Push the visual ambition hard, but protect the learning loop. The highest-value surfaces are tutor, mock results, dashboard, and practice. If schedule pressure appears, ship the shared shell plus those four first, then complete explore, progress, mistakes, and auth polish.

The north star is simple: a learner should open Ascend AI and feel like studying is an expedition, a challenge, and a game they can win.
