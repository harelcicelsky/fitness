import { db } from "../db/schema";

const WORKOUTS_PER_LEVEL = 5;
export const MAX_LEVEL = 10;
const ADHERENCE_WINDOW_DAYS = 28;

export interface AvatarStats {
  muscleLevel: number;          // 0..MAX_LEVEL
  totalCompleted: number;
  recentCompleted: number;       // in last ADHERENCE_WINDOW_DAYS
  recentTarget: number;          // workoutsPerWeek * 4
  adherence: number;             // 0..1.5 (capped)
  toNextLevel: number;           // workouts needed
  fallingBehind: boolean;        // recent rate is < 60% of target
}

export async function computeAvatarStats(workoutsPerWeek: number): Promise<AvatarStats> {
  const all = await db.workouts.toArray();
  const completed = all.filter((w) => w.endedAt !== null);
  const now = Date.now();
  const cutoff = now - ADHERENCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentCompleted = completed.filter((w) => w.startedAt >= cutoff).length;
  const recentTarget = Math.max(1, workoutsPerWeek * 4);

  const adherenceRaw = recentCompleted / recentTarget;
  const adherence = Math.min(1.5, adherenceRaw);

  // Base level scales with total volume of workouts done.
  // Adherence multiplier rewards consistency (above 1.0 nudges level up faster).
  const adjustedTotal = completed.length * Math.max(0.5, adherence);
  const muscleLevel = Math.max(
    0,
    Math.min(MAX_LEVEL, Math.floor(adjustedTotal / WORKOUTS_PER_LEVEL)),
  );

  const nextThreshold = (muscleLevel + 1) * WORKOUTS_PER_LEVEL;
  const toNextLevel =
    muscleLevel >= MAX_LEVEL
      ? 0
      : Math.max(1, Math.ceil(nextThreshold - adjustedTotal));

  return {
    muscleLevel,
    totalCompleted: completed.length,
    recentCompleted,
    recentTarget,
    adherence,
    toNextLevel,
    fallingBehind: completed.length > 0 && adherenceRaw < 0.6,
  };
}
