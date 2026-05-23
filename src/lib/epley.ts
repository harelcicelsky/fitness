// Epley 1RM estimate: weight * (1 + reps / 30). Reps == 1 returns weight unchanged.
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}
