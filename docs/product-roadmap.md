# Product Roadmap — Workout Tracker

## Build philosophy

- Each phase ends with a working, demoable app you can use on your phone.
- Local-first from day one. Never require network for core flow.
- Mobile-first UI. Test every change on a phone-sized viewport.
- Ship rough, then polish. Phase 4 is where it stops looking like a prototype.

## Phase 0 — Repo, scaffold, deploy

**Goal:** Blank Vite app live on Vercel/Netlify URL, opens on phone.

- [ ] **TASK-001** — Init git repo locally
  Files: `.gitignore`
  Notes: Standard Node `.gitignore` (node_modules, dist, .env*, .vercel, .netlify).

- [ ] **TASK-002** — Scaffold Vite + React + TypeScript
  Files: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
  Notes: Use `npm create vite@latest . -- --template react-ts` (run inside the project dir).

- [ ] **TASK-003** — Install Tailwind CSS + PostCSS
  Files: `tailwind.config.ts`, `postcss.config.js`, `src/index.css`
  Notes: Tailwind v3.x. Mobile-first defaults. Enable `darkMode: 'class'`.

- [ ] **TASK-004** — Install Dexie, Recharts, vite-plugin-pwa, uuid
  Files: `package.json`
  Notes: `npm i dexie recharts uuid`; `npm i -D vite-plugin-pwa @types/uuid`.

- [ ] **TASK-005** — Configure PWA manifest + service worker (registerType: 'autoUpdate')
  Files: `vite.config.ts`, `public/manifest.webmanifest`, `public/icons/*`
  Notes: Placeholder icons OK for now (192/512). App name "Workout Tracker", theme dark.

- [ ] **TASK-006** — App shell: bottom NavBar with 4 tabs (Today / History / Progress / Templates) + Settings cog
  Files: `src/App.tsx`, `src/components/NavBar.tsx`, `src/screens/Today.tsx`, `src/screens/History.tsx`, `src/screens/Progress.tsx`, `src/screens/Templates.tsx`, `src/screens/Settings.tsx`
  Notes: Use simple state-based routing (no react-router yet — keep bundle small). Each screen is a placeholder.

- [ ] **TASK-007** — Verify dev server, build, and preview all work
  Notes: `npm run dev`, then `npm run build && npm run preview`. No errors.

- [ ] **TASK-008** — Push to GitHub, connect Vercel, confirm deployed URL works on phone
  Notes: User does this manually. Vercel auto-imports Vite. Confirm the live URL loads.

**Phase 0 done when:** You can open the deployed URL on your phone, see the 4 tabs, and tap between blank screens.

---

## Phase 1 — Data model + log a workout end to end

**Goal:** You can start a workout, pick exercises, log sets (with RPE/RIR, drop sets, supersets, cardio), and reload the page without losing data.

- [ ] **TASK-009** — Define Dexie schema with all tables
  Files: `src/db/schema.ts`, `src/types.ts`
  Notes: See [prd.md](./prd.md) Data Model. Tables: exercises, workouts, blocks, sets, cardio_sessions, bodyWeight, templates, settings. Version 1.

- [ ] **TASK-010** — Seed default exercise library (~50 lifts + ~10 cardio)
  Files: `src/db/seed.ts`
  Notes: Run on first DB open if exercises table empty. Cover squat/bench/dl/OHP/row variants, common accessories, treadmill/bike/row/elliptical for cardio.

- [ ] **TASK-011** — Data access helpers
  Files: `src/db/queries.ts`
  Notes: createWorkout, addBlock, addSet, addCardioSession, addDropSet, getActiveWorkout, completeWorkout, getExercises (with archived filter), etc.

- [ ] **TASK-012** — NumberStepper component (mobile-friendly weight/reps input)
  Files: `src/components/NumberStepper.tsx`
  Notes: ±buttons + direct input with `inputmode="decimal"`. Step 2.5 for weight, 1 for reps.

- [ ] **TASK-013** — ExercisePicker component
  Files: `src/components/ExercisePicker.tsx`
  Notes: Searchable list, filter by muscle, "+ Custom" at bottom.

- [ ] **TASK-014** — Today screen: start workout flow
  Files: `src/screens/Today.tsx`
  Notes: If no active workout, show "Start Workout" + "From Template" buttons. If active, show blocks list.

- [ ] **TASK-015** — SetRow component (weight, reps, optional RPE/RIR pill, ✓)
  Files: `src/components/SetRow.tsx`
  Notes: Persist on ✓. Editable after. Long-press → delete.

- [ ] **TASK-016** — DropSetRow + "Drop" action on parent
  Files: `src/components/DropSetRow.tsx`, `src/components/SetRow.tsx`
  Notes: Drop sets render indented under parent. Same SetRow but `parentSetId` set.

- [ ] **TASK-017** — SupersetBlock component (2+ exercises)
  Files: `src/components/SupersetBlock.tsx`
  Notes: Visually grouped. "Round 1 / Round 2" set indexing.

- [ ] **TASK-018** — CardioRow component
  Files: `src/components/CardioRow.tsx`
  Notes: Duration (mm:ss input), distance (km display, m stored), HR avg/max, calories.

- [ ] **TASK-019** — "Add Exercise" / "Add Superset" / "Add Cardio" actions on Today
  Files: `src/screens/Today.tsx`
  Notes: Opens ExercisePicker; commits new block to DB.

- [ ] **TASK-020** — "End Workout" button → sets endedAt, returns to start state
  Files: `src/screens/Today.tsx`

- [ ] **TASK-021** — Verify end-to-end: start workout → log strength + superset + drop set + cardio → end → reload → see workout in History (placeholder OK if History still empty)
  Notes: Manual smoke test in Chrome DevTools mobile mode.

**Phase 1 done when:** You can complete a real workout in the app and the data is still there after refresh.

---

## Phase 2 — Templates + history

**Goal:** Reuse templates for fast logging; review past workouts.

- [ ] **TASK-022** — Templates screen: list, create, edit, duplicate, delete
  Files: `src/screens/Templates.tsx`

- [ ] **TASK-023** — Template editor: pick blocks, set defaults (sets/reps/weight)
  Files: `src/screens/Templates.tsx`

- [ ] **TASK-024** — "Use template" → Today screen with blocks pre-loaded
  Files: `src/screens/Today.tsx`, `src/screens/Templates.tsx`

- [ ] **TASK-025** — History screen: reverse-chronological list
  Files: `src/screens/History.tsx`
  Notes: Show date, total volume, exercises summary.

- [ ] **TASK-026** — HistoryDetail screen: full workout view, editable
  Files: `src/screens/HistoryDetail.tsx`

- [ ] **TASK-027** — Edit/delete past sets and workouts
  Files: `src/screens/HistoryDetail.tsx`, `src/db/queries.ts`

**Phase 2 done when:** You can save a template, use it next session, and review last week's workouts.

---

## Phase 3 — Progress charts + PRs

**Goal:** Answer "am I getting stronger?" at a glance.

- [ ] **TASK-028** — Lazy-load Recharts on Progress screen only
  Files: `src/screens/Progress.tsx`

- [ ] **TASK-029** — Per-exercise weight-over-time chart (top set per session)
  Files: `src/screens/Progress.tsx`

- [ ] **TASK-030** — Estimated 1RM (Epley: weight × (1 + reps/30))
  Files: `src/lib/epley.ts`, `src/screens/Progress.tsx`

- [ ] **TASK-031** — PR list per exercise (heaviest weight × reps, best 1RM, best volume)
  Files: `src/screens/Progress.tsx`, `src/db/queries.ts`

- [ ] **TASK-032** — Body weight log + chart (separate tab on Progress)
  Files: `src/screens/Progress.tsx`

- [ ] **TASK-033** — Recompute PRs on edit/delete of past sets
  Files: `src/db/queries.ts`

**Phase 3 done when:** Logging a heavy set updates the PR list and the chart.

---

## Phase 4 — Polish & PWA

**Goal:** Feels like a real app. Installable. Offline. Backup/restore works.

- [ ] **TASK-034** — Real PWA icons (any tool: realfavicongenerator, or AI-gen + crop)
  Files: `public/icons/*`

- [ ] **TASK-035** — Rest timer between sets
  Files: `src/components/RestTimer.tsx`, `src/screens/Today.tsx`
  Notes: Optionally auto-start on ✓ (toggle in Settings).

- [ ] **TASK-036** — "Same as last time" quick-add per exercise
  Files: `src/components/SetRow.tsx`, `src/db/queries.ts`

- [ ] **TASK-037** — JSON export (download all data as .json file)
  Files: `src/lib/exportImport.ts`, `src/screens/Settings.tsx`

- [ ] **TASK-038** — JSON import (with schema validation + confirm overwrite)
  Files: `src/lib/exportImport.ts`, `src/screens/Settings.tsx`

- [ ] **TASK-039** — Dark mode (default + system preference)
  Files: `src/screens/Settings.tsx`, `src/App.tsx`

- [ ] **TASK-040** — Custom exercise add + archive default exercises
  Files: `src/components/ExercisePicker.tsx`, `src/screens/Settings.tsx`

- [ ] **TASK-041** — Verify: install PWA on phone, kill wifi, log a workout, restore wifi, refresh — all data still there
  Notes: Final acceptance test.

**Phase 4 done when:** App is installed on your phone, works offline, and you've used it for a real session in the gym.

---

## Phase 5 (OPTIONAL) — Cloud sync + public launch

Not planned. Trigger only if you decide to launch publicly. Re-enter PLAID at `/plaid validate` first.

- Auth (Clerk free tier or Supabase Auth)
- Sync layer (Supabase or Convex)
- Landing page
- Custom domain
- App Store wrap (Capacitor) if going native

---

## Agent session guide

- One phase per session is a comfortable cadence.
- Each task is small enough to ship in <30 min in most cases.
- After each task: tick the box, commit with `feat:` / `fix:` / `chore:` prefix.
- Don't skip TASK-021 / TASK-041 — they're the smoke tests that catch broken assumptions.
