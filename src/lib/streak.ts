import { db } from "../db/schema";

/**
 * Workout streak — counts the number of consecutive calendar days, ending
 * either today or yesterday, that had at least one completed workout.
 *
 * "Yesterday-ending" is intentional: if you trained yesterday but haven't
 * trained yet today, your streak is still alive (you haven't lost it yet).
 * It only breaks once you skip 2+ days in a row.
 */
export async function computeStreak(): Promise<{
  current: number;
  best: number;
  trainedToday: boolean;
}> {
  const workouts = await db.workouts.toArray();
  const completed = workouts.filter((w) => w.endedAt !== null);
  if (completed.length === 0) return { current: 0, best: 0, trainedToday: false };

  // Collect unique YYYY-MM-DD day strings (in local time)
  const days = new Set<string>();
  for (const w of completed) {
    days.add(toDayKey(w.startedAt));
  }
  const sortedDays = Array.from(days).sort(); // ascending

  // Compute best-ever streak by walking the sorted set
  let best = 1;
  let run = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    if (isConsecutive(sortedDays[i - 1], sortedDays[i])) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  // Current streak ends at today (if trained) or yesterday (grace day)
  const todayKey = toDayKey(Date.now());
  const yesterdayKey = toDayKey(Date.now() - 24 * 60 * 60 * 1000);
  const trainedToday = days.has(todayKey);

  let cursor = trainedToday ? todayKey : days.has(yesterdayKey) ? yesterdayKey : null;
  let current = 0;
  while (cursor && days.has(cursor)) {
    current++;
    cursor = prevDayKey(cursor);
  }

  return { current, best: Math.max(best, current), trainedToday };
}

function toDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prevDayKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d - 1);
  return toDayKey(date.getTime());
}

function isConsecutive(a: string, b: string): boolean {
  return prevDayKey(b) === a;
}
