# PRD — Workout Tracker

## Overview

- **Name:** Workout Tracker
- **One-liner:** Local-first PWA for logging strength + cardio workouts.
- **Magic moment:** Tap template → log first set in <5s → see PR delta.
- **Stack:** React 18 + Vite + TypeScript, Tailwind CSS, Dexie.js (IndexedDB), Recharts, vite-plugin-pwa, hosted on Vercel/Netlify free tier.

## Architecture

```
┌─────────────────────────────────────────────┐
│  Browser (Phone or Desktop)                 │
│  ┌───────────────────────────────────────┐  │
│  │  React App (static bundle, PWA)       │  │
│  │  ├─ Screens: Today, History,          │  │
│  │  │           Progress, Templates,     │  │
│  │  │           Settings                  │  │
│  │  └─ State: React + IndexedDB (Dexie)  │  │
│  └───────────────────────────────────────┘  │
│              ▼                              │
│  IndexedDB (local, persistent, offline)     │
└─────────────────────────────────────────────┘
         ▲ deployed via git push
         │
   Vercel/Netlify (free tier static hosting)
```

No server. No API. No external runtime calls. Everything client-side.

## Repo structure

```
workout-tracker/
├─ docs/                       # this folder
├─ public/
│  ├─ icons/                   # PWA icons
│  └─ manifest.webmanifest
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx
│  ├─ db/
│  │  ├─ schema.ts             # Dexie tables
│  │  ├─ seed.ts               # default exercise library
│  │  └─ queries.ts            # data access helpers
│  ├─ screens/
│  │  ├─ Today.tsx
│  │  ├─ History.tsx
│  │  ├─ HistoryDetail.tsx
│  │  ├─ Progress.tsx
│  │  ├─ Templates.tsx
│  │  └─ Settings.tsx
│  ├─ components/
│  │  ├─ ExercisePicker.tsx
│  │  ├─ SetRow.tsx
│  │  ├─ DropSetRow.tsx
│  │  ├─ SupersetBlock.tsx
│  │  ├─ CardioRow.tsx
│  │  ├─ RestTimer.tsx
│  │  ├─ NumberStepper.tsx
│  │  └─ NavBar.tsx
│  ├─ lib/
│  │  ├─ epley.ts              # 1RM estimate
│  │  ├─ format.ts             # date / number formatting
│  │  └─ exportImport.ts       # JSON dump/restore
│  └─ types.ts
├─ index.html
├─ vite.config.ts
├─ tailwind.config.ts
├─ postcss.config.js
├─ tsconfig.json
├─ package.json
├─ vision.json
└─ .gitignore
```

## Data model (Dexie / IndexedDB)

All weights stored in **kg** as canonical unit. Times in **seconds**. Distances in **meters**.

### `exercises`
| field | type | notes |
|---|---|---|
| id | string (uuid) | PK |
| name | string | "Barbell Back Squat" |
| category | enum | "compound" \| "isolation" \| "cardio" \| "mobility" |
| primaryMuscles | string[] | e.g. ["quads","glutes"] |
| equipment | string | "barbell", "dumbbell", "machine", "bodyweight", "treadmill", etc. |
| isCardio | boolean | true → log via cardio_sessions, not sets |
| isCustom | boolean | false for seeded, true for user-added |
| archived | boolean | hide from picker without deleting |

### `workouts`
| field | type | notes |
|---|---|---|
| id | string | PK |
| date | string | ISO date (YYYY-MM-DD) |
| startedAt | number | epoch ms |
| endedAt | number \| null |  |
| templateId | string \| null | source template if any |
| notes | string |  |

### `blocks` (exercise blocks within a workout)
| field | type | notes |
|---|---|---|
| id | string | PK |
| workoutId | string | FK |
| order | number |  |
| type | enum | "single" \| "superset" \| "circuit" |
| exerciseIds | string[] | length 1 for single, 2+ for superset/circuit |

### `sets`
| field | type | notes |
|---|---|---|
| id | string | PK |
| workoutId | string | FK (denormalized for fast queries) |
| blockId | string | FK |
| exerciseId | string | FK |
| order | number | within block |
| weightKg | number |  |
| reps | number |  |
| rpe | number \| null | 1–10, half steps allowed |
| rir | number \| null | 0–5+, alternative to RPE |
| isWarmup | boolean |  |
| parentSetId | string \| null | non-null = this is a drop within parent set |
| completedAt | number | epoch ms |

A drop set is modeled as multiple `sets` rows sharing a `parentSetId` (the first row's id). UI groups them visually.

### `cardio_sessions`
| field | type | notes |
|---|---|---|
| id | string | PK |
| workoutId | string | FK |
| blockId | string | FK |
| exerciseId | string | FK (must have isCardio=true) |
| durationSec | number |  |
| distanceM | number \| null |  |
| avgHr | number \| null | bpm |
| maxHr | number \| null | bpm |
| calories | number \| null |  |
| notes | string |  |

### `bodyWeight`
| field | type | notes |
|---|---|---|
| id | string | PK |
| date | string | ISO date |
| weightKg | number |  |
| recordedAt | number | epoch ms |

### `templates`
| field | type | notes |
|---|---|---|
| id | string | PK |
| name | string | "Push A", "Legs" |
| blocks | TemplateBlock[] | inline (not normalized) |

```ts
type TemplateBlock = {
  type: "single" | "superset" | "circuit";
  exerciseIds: string[];
  defaultSets?: number;       // suggested set count
  defaultReps?: number;       // suggested reps
  defaultWeightKg?: number;   // last-used or starter
};
```

### `settings` (single row)
| field | type | notes |
|---|---|---|
| id | "settings" | constant PK |
| theme | "system" \| "light" \| "dark" |  |
| restTimerDefaultSec | number | default 120 |
| autoStartRestTimer | boolean |  |
| useRpeOrRir | "rpe" \| "rir" \| "off" |  |

## Screens

### Today
- Header: date, "Start Workout" or "Continue Workout" button
- If active workout: list of blocks → list of sets per block → "+ Set" button per exercise → "Add Exercise" / "Add Superset" / "Add Cardio" buttons
- Quick template loader at top: "From Template ▾"
- Set row: weight, reps, optional RPE/RIR pill, ✓ to mark complete
- Drop set: tap "Drop" on a completed set → spawns indented child row
- Superset block: 2+ exercises rendered side-by-side (or stacked on narrow screens) with shared set counter
- Sticky bottom: rest timer if running

### History
- Reverse-chronological list of workouts
- Tap → HistoryDetail showing full workout, editable

### Progress
- Top: pick exercise (autocomplete)
- Chart: weight over time (top set per session), est. 1RM (Epley) overlay
- Below: list of PRs (heaviest weight × reps, best 1RM, best volume)
- Tab: Body Weight chart

### Templates
- List user templates
- Create / edit / duplicate / delete
- "Use this template" → navigates to Today with prefilled blocks

### Settings
- Theme toggle
- Rest timer default
- RPE vs RIR vs off
- Export JSON
- Import JSON (with confirm overwrite warning)
- Manage exercise library (add custom, archive defaults)

## Functional requirements

- **FR-001** (P0) Log strength set with weight + reps. Persist immediately on ✓.
- **FR-002** (P0) Multi-set logging per exercise within a workout.
- **FR-003** (P0) Add/remove exercises within active workout.
- **FR-004** (P0) Save/load workout templates.
- **FR-005** (P0) View workout history list and detail.
- **FR-006** (P0) Edit/delete past sets and workouts.
- **FR-007** (P0) Per-exercise progress chart (weight over time).
- **FR-008** (P0) PR list per exercise.
- **FR-009** (P0) Body weight log + chart.
- **FR-010** (P0) Persist data in IndexedDB across reload/offline.
- **FR-011** (P1) RPE/RIR per set (toggleable).
- **FR-012** (P1) Drop sets (parent + children).
- **FR-013** (P1) Supersets/circuits (block of 2+ exercises).
- **FR-014** (P1) Cardio session logging.
- **FR-015** (P1) Rest timer with default + per-exercise override.
- **FR-016** (P1) JSON export/import.
- **FR-017** (P1) PWA install (manifest, service worker, offline shell).
- **FR-018** (P2) Dark mode.
- **FR-019** (P2) "Same as last time" quick-add button.
- **FR-020** (P2) Custom exercise add.

## Non-functional requirements

- Mobile-first. All tap targets ≥ 44px. Numeric inputs use `inputmode="decimal"`.
- Offline-capable. App shell + assets cached by service worker.
- Initial load < 200KB gzipped JS (excluding charts lazy-loaded on Progress screen).
- All writes < 50ms perceived latency (IndexedDB is fast; just don't block UI).
- Zero external runtime calls (no analytics, no fonts from CDN — bundle if needed).
- Works in modern Chrome/Safari/Firefox (last 2 versions).

## Edge cases

- Two workouts on same date → allowed, distinguish by startedAt.
- Active workout with no sets logged + user closes app → keep in DB as draft, show "Resume" on Today next visit.
- Import JSON that doesn't match schema → show validation errors, don't apply.
- Editing a past set that was a PR → recompute PRs for that exercise on save.
- Delete an exercise that has logged sets → soft archive only; never hard delete (would orphan history).

## Out of scope (explicit)

- User accounts, login, cloud sync
- Push notifications
- Apple Health / Google Fit / Strava integration
- Social/sharing
- Coaching content, form videos
- AI-generated programs
- Periodization beyond simple templates

## Open questions

None blocking. Design tokens (palette, type scale) deferred — running with sensible Tailwind defaults until / if `/plaid design` is run.
