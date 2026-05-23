import { db } from "../db/schema";
import type { SetEntry, Workout } from "../types";

export interface RepRange {
  min: number;
  max: number;
}

export const SET_TARGETS: RepRange[] = [
  { min: 6, max: 8 },   // Set 1 — heaviest
  { min: 6, max: 10 },  // Set 2
  { min: 8, max: 12 },  // Set 3 — back-off
];

export type Verdict = "increase" | "hold" | "decrease" | "first-time";

export interface Recommendation {
  setIndex: number;       // 0-based
  target: RepRange;
  recommendedWeightKg: number;
  verdict: Verdict;
  rationale: string;
  basis: { weightKg: number; reps: number; date: string } | null;
}

const STEP_KG = 2.5;

// Round to nearest 2.5 kg, never below 0.
function snap(weightKg: number): number {
  return Math.max(0, Math.round(weightKg / STEP_KG) * STEP_KG);
}

// Pick the most recent prior workout for this exercise that has at least one
// non-drop, non-warmup set, and return that workout's parent sets in
// chronological order.
async function loadLastSessionSets(
  exerciseId: string,
): Promise<{ workout: Workout; sets: SetEntry[] } | null> {
  const [allSets, allWorkouts] = await Promise.all([
    db.sets.where("exerciseId").equals(exerciseId).toArray(),
    db.workouts.toArray(),
  ]);
  if (allSets.length === 0) return null;

  const woMap = new Map(allWorkouts.map((w) => [w.id, w]));
  const byWorkout = new Map<string, SetEntry[]>();
  for (const s of allSets) {
    if (s.parentSetId) continue;     // drop sets don't count as a "main" set
    if (s.isWarmup) continue;
    const arr = byWorkout.get(s.workoutId) ?? [];
    arr.push(s);
    byWorkout.set(s.workoutId, arr);
  }

  const candidates = Array.from(byWorkout.entries())
    .map(([wid, sets]) => ({
      workout: woMap.get(wid),
      sets: sets.slice().sort((a, b) => a.completedAt - b.completedAt),
    }))
    .filter((c): c is { workout: Workout; sets: SetEntry[] } => !!c.workout && c.sets.length > 0)
    .sort((a, b) => b.workout.startedAt - a.workout.startedAt);

  return candidates[0] ?? null;
}

export async function recommendNextSession(
  exerciseId: string,
): Promise<Recommendation[]> {
  const last = await loadLastSessionSets(exerciseId);

  return SET_TARGETS.map((target, i): Recommendation => {
    const prior = last?.sets[i];
    if (!prior) {
      // No prior data for this set position — for set 1 with no history at all,
      // we can't propose a starting weight (every body is different). For sets
      // 2/3 when set 1 exists, suggest matching set 1's recommendation.
      return {
        setIndex: i,
        target,
        recommendedWeightKg: 0,
        verdict: "first-time",
        rationale:
          i === 0
            ? "No history yet — pick a weight you can do for 6–8 clean reps."
            : `No prior set ${i + 1} — try the same weight as set ${i}, then adjust by feel.`,
        basis: null,
      };
    }

    const reps = prior.reps;
    const weight = prior.weightKg;
    const basis = { weightKg: weight, reps, date: last!.workout.date };

    if (reps >= target.max) {
      return {
        setIndex: i,
        target,
        recommendedWeightKg: snap(weight + STEP_KG),
        verdict: "increase",
        rationale: `Hit ${reps} reps last time at ${weight} kg — top of the ${target.min}–${target.max} range. Add 2.5 kg.`,
        basis,
      };
    }

    if (reps < target.min) {
      return {
        setIndex: i,
        target,
        recommendedWeightKg: snap(weight - STEP_KG),
        verdict: "decrease",
        rationale: `Only ${reps} reps last time at ${weight} kg — below the ${target.min}–${target.max} range. Drop 2.5 kg.`,
        basis,
      };
    }

    return {
      setIndex: i,
      target,
      recommendedWeightKg: weight,
      verdict: "hold",
      rationale: `${reps} reps at ${weight} kg last time — in range. Hold weight, push for more reps (target ${reps + 1}–${target.max}).`,
      basis,
    };
  });
}
