# Product Vision — Workout Tracker

## What it is

A local-first Progressive Web App for logging workouts. Strength training (sets/reps/weight, with RPE/RIR, supersets, drop sets) and cardio (time/distance/HR). Lives in the browser, works offline, installs to phone home screen.

## Why this, why now

Existing apps are either bloated, locked behind subscriptions, require accounts, or both. I want a fast, private, free tool that I own end-to-end and can change at will.

## Magic moment

Open the app on the gym floor → tap "Push A" template → log first set in under 5 seconds → see "↑5kg vs last week" on the screen.

## Who it's for

**Phase 1 (now):** Me. Personal use. No accounts, no telemetry, no marketing.

**Phase 2 (maybe):** Other lifters who want the same thing — fast, private, free, no-bullshit logging — IF I decide to launch after using it for a while.

## MVP scope (in)

- Log strength sets: weight (kg), reps, optional RPE/RIR
- Drop sets (multi-drop within one logical set)
- Supersets / circuits (group exercises, log in alternation)
- Cardio sessions: duration, distance, avg/max HR, calories
- Workout templates (e.g. "Push A", "Pull A", "Legs")
- History: browse past workouts, edit, delete
- Progress charts per exercise (weight over time, est. 1RM)
- PR tracking
- Body weight log
- PWA install (phone home screen, offline)
- JSON export / import
- Dark mode

## Out of scope (explicit cuts)

- Accounts / login (it's just me)
- Cloud sync (manual JSON export covers backups for now)
- Social features
- AI-generated programs
- Coaching, form videos
- Subscriptions / payments
- Apple Health / Google Fit integration
- Wearable sync
- Push notifications
- Programs/periodization tools beyond simple templates

These come back on the table only if Phase 5 (public launch) happens.

## Non-goals

- Pretty for screenshots — function over form
- Gamification (no streaks, no badges)
- Coach-facing tools

## Success criteria (personal)

- I use it for every gym session for 4+ weeks straight
- It's faster to log a set than my current method (whatever that is — paper, notes app, another app)
- I can answer "did I PR this lift?" without scrolling

## Success criteria (if launched, future)

- Defined later in Phase 5 if it happens. Likely: 100 weekly active users from one Reddit post.

## Brand voice (minimal — it's for me)

Direct, no jargon, no motivational quotes. UI copy is functional ("Add set", "PR ↑5kg") not coachy ("You crushed it!").

## Visual design

Not yet specced. Will run `/plaid design` if/when launching publicly. For personal use: clean, dark-mode-default, big tap targets, numeric inputs that don't fight with mobile keyboards.
