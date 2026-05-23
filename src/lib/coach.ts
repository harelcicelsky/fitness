import { db } from "../db/schema";
import type { BodyWeightEntry, UserProfile, WeightPhase } from "../types";

export type CoachSeverity = "good" | "info" | "warn" | "bad";

export interface CoachInsight {
  id: string;
  severity: CoachSeverity;
  icon: string;
  title: string;
  body: string;
  // Numeric metric attached to the insight (e.g. trend kg/wk) — optional, used
  // to render a chip next to the title.
  metric?: string;
}

interface CoachInputs {
  profile: UserProfile;
  weights: BodyWeightEntry[];
  completedWorkoutsLast7d: number;
  completedWorkoutsLast28d: number;
}

/**
 * Generate prioritized coaching insights based on the user's phase, weight
 * trend, and training adherence. This is a deterministic rule engine — the
 * "AI" framing is honest because the rules are derived from sports-science
 * literature on body composition phases (Helms / Norton / Schoenfeld).
 *
 * Output is sorted: high-severity first (bad → warn → info → good), then by
 * insertion order. Caller typically renders the top 3-4.
 */
export function generateCoachInsights(inputs: CoachInputs): CoachInsight[] {
  const out: CoachInsight[] = [];
  const { profile, weights, completedWorkoutsLast7d, completedWorkoutsLast28d } = inputs;

  // ───── 1. Bodyweight setup nudges ──────────────────────────────────────
  if (weights.length === 0) {
    out.push({
      id: "weight-empty",
      severity: "info",
      icon: "⚖️",
      title: "Log your bodyweight",
      body: "Recommendations get smarter once I can see how your weight is trending against your plan. Even one entry helps.",
    });
  }

  // ───── 2. Weight trend vs phase target ─────────────────────────────────
  // Compute a 14-day trend if we have at least 2 entries spanning a week
  const sorted = [...weights].sort((a, b) => a.recordedAt - b.recordedAt);
  if (sorted.length >= 2) {
    const trendKgPerWeek = computeTrend(sorted);
    if (trendKgPerWeek !== null) {
      out.push(...phaseTrendInsight(profile.phase, trendKgPerWeek, sorted));
    }
  }

  // ───── 3. Distance to target weight ─────────────────────────────────────
  if (profile.targetWeightKg !== null && sorted.length > 0) {
    const current = sorted[sorted.length - 1].weightKg;
    const delta = current - profile.targetWeightKg;
    if (Math.abs(delta) <= 0.5) {
      out.push({
        id: "target-hit",
        severity: "good",
        icon: "🎯",
        title: "Target weight reached",
        body: `You're within 0.5kg of your ${profile.targetWeightKg} kg target. Consider switching to maintain to lock the gains.`,
      });
    } else {
      const direction = delta > 0 ? "above" : "below";
      out.push({
        id: "target-distance",
        severity: "info",
        icon: "📏",
        title: `${Math.abs(delta).toFixed(1)} kg from your target`,
        body: `Current: ${current.toFixed(1)} kg · Target: ${profile.targetWeightKg.toFixed(1)} kg (${direction}).`,
        metric: `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`,
      });
    }
  }

  // ───── 4. Training adherence ───────────────────────────────────────────
  const target = profile.workoutsPerWeek;
  if (completedWorkoutsLast7d < Math.ceil(target * 0.6)) {
    out.push({
      id: "adherence-low",
      severity: "warn",
      icon: "⚠️",
      title: "Behind on training volume",
      body: `${completedWorkoutsLast7d}/${target} sessions this week. Phases stall when the work isn't there — pick a day, just one set.`,
    });
  } else if (completedWorkoutsLast7d >= target) {
    out.push({
      id: "adherence-good",
      severity: "good",
      icon: "✅",
      title: "On pace this week",
      body: `${completedWorkoutsLast7d}/${target} sessions logged. Keep stacking.`,
    });
  }

  // ───── 5. Recovery flag: 7+ days/wk for 4 weeks straight ───────────────
  if (target >= 6 && completedWorkoutsLast28d >= target * 4) {
    out.push({
      id: "deload",
      severity: "info",
      icon: "🛌",
      title: "Consider a deload week",
      body: "4 weeks straight at high frequency. A 50%-volume week now usually beats forcing it.",
    });
  }

  // ───── 6. Phase-specific tips ──────────────────────────────────────────
  out.push(phaseStrategyInsight(profile.phase, profile.goal));

  return out.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
}

function severityRank(s: CoachSeverity): number {
  return { bad: 0, warn: 1, info: 2, good: 3 }[s];
}

function computeTrend(sorted: BodyWeightEntry[]): number | null {
  // Use the last 14 days if available, otherwise the full available window.
  const lastTs = sorted[sorted.length - 1].recordedAt;
  const cutoffTs = lastTs - 14 * 24 * 60 * 60 * 1000;
  const recent = sorted.filter((e) => e.recordedAt >= cutoffTs);
  if (recent.length < 2) return null;
  const first = recent[0];
  const last = recent[recent.length - 1];
  const daysSpan = (last.recordedAt - first.recordedAt) / (24 * 60 * 60 * 1000);
  if (daysSpan < 3) return null; // need ≥3 days to be meaningful
  const deltaKg = last.weightKg - first.weightKg;
  return (deltaKg / daysSpan) * 7;
}

function phaseTrendInsight(
  phase: WeightPhase,
  trend: number,
  weights: BodyWeightEntry[],
): CoachInsight[] {
  const metric = `${trend > 0 ? "+" : ""}${trend.toFixed(2)} kg/wk`;
  const current = weights[weights.length - 1].weightKg;
  const out: CoachInsight[] = [];

  if (phase === "cut") {
    // Expected: -0.3 to -0.7 kg/wk
    if (trend > 0.1) {
      out.push({
        id: "cut-gaining",
        severity: "bad",
        icon: "📈",
        title: "Cut isn't working — you're gaining",
        body: "Bodyweight is climbing in a cut phase. Drop calories ~200/day, or audit weekend eating. Training cardio is the lever, food is the dial.",
        metric,
      });
    } else if (trend > -0.15) {
      out.push({
        id: "cut-stalled",
        severity: "warn",
        icon: "🪨",
        title: "Cut is stalling",
        body: `Trending ${metric} — barely losing. Try a ~150 cal/day deficit increase, or push 1 extra cardio session this week.`,
        metric,
      });
    } else if (trend < -1.0) {
      out.push({
        id: "cut-too-fast",
        severity: "warn",
        icon: "🚨",
        title: "Losing weight too fast",
        body: "Aggressive deficits eat muscle. Aim for 0.5–0.7% of bodyweight per week — add 200 cal/day back.",
        metric,
      });
    } else {
      out.push({
        id: "cut-ontrack",
        severity: "good",
        icon: "✂️",
        title: "Cut is dialed",
        body: `Trending ${metric} at ${current.toFixed(1)} kg — clean rate. Keep food + training where they are.`,
        metric,
      });
    }
  } else if (phase === "bulk") {
    // Expected: +0.2 to +0.4 kg/wk
    if (trend < -0.05) {
      out.push({
        id: "bulk-losing",
        severity: "bad",
        icon: "📉",
        title: "Bulk isn't bulking",
        body: "You're losing weight while trying to grow. Add ~250 cal/day — usually 1–2 extra carb portions does it.",
        metric,
      });
    } else if (trend < 0.15) {
      out.push({
        id: "bulk-too-slow",
        severity: "warn",
        icon: "🐌",
        title: "Bulk too conservative",
        body: `Only ${metric} — gains will crawl. Push to 0.25–0.4 kg/wk for hypertrophy. Add a snack between meals.`,
        metric,
      });
    } else if (trend > 0.6) {
      out.push({
        id: "bulk-too-fast",
        severity: "warn",
        icon: "🍔",
        title: "Gaining too fast",
        body: "Most of this is fat, not muscle. Trim ~150 cal/day. Slow & steady builds a cleaner physique.",
        metric,
      });
    } else {
      out.push({
        id: "bulk-ontrack",
        severity: "good",
        icon: "📈",
        title: "Bulk on rails",
        body: `Trending ${metric} at ${current.toFixed(1)} kg — clean lean-bulk pace. Hit your protein, sleep 7+ hrs.`,
        metric,
      });
    }
  } else if (phase === "recomp") {
    // Expected: -0.1 to +0.1 kg/wk
    if (Math.abs(trend) > 0.25) {
      out.push({
        id: "recomp-drift",
        severity: "warn",
        icon: "⚖️",
        title: "Drifting from recomp",
        body: trend > 0
          ? "You're gaining noticeable weight. If you want lean recomp, hold calories closer to maintenance."
          : "You're losing — this is closer to a cut than recomp. Bump calories if recomp is the goal.",
        metric,
      });
    } else {
      out.push({
        id: "recomp-ontrack",
        severity: "good",
        icon: "♻️",
        title: "Recomp pace is clean",
        body: `Holding ${current.toFixed(1)} kg (${metric}). Strength gains + mirror progress are the real signal here.`,
        metric,
      });
    }
  } else {
    // maintain
    if (Math.abs(trend) > 0.3) {
      out.push({
        id: "maintain-drift",
        severity: "warn",
        icon: "🎚️",
        title: "Drifting from maintenance",
        body: trend > 0 ? "Up too quickly for maintenance." : "Down too quickly for maintenance.",
        metric,
      });
    } else {
      out.push({
        id: "maintain-stable",
        severity: "good",
        icon: "⚖️",
        title: "Holding steady",
        body: `${current.toFixed(1)} kg (${metric}). Maintenance is the hardest plate to spin — well done.`,
        metric,
      });
    }
  }

  return out;
}

function phaseStrategyInsight(
  phase: WeightPhase,
  goal: UserProfile["goal"],
): CoachInsight {
  if (phase === "cut") {
    return {
      id: "strategy-cut",
      severity: "info",
      icon: "🥩",
      title: "Cut strategy",
      body:
        goal === "strength"
          ? "Keep weights heavy (5×5 / 3×5). Cutting + low reps protects strength. Don't add volume."
          : "Protein 2.0 g/kg, hit your top sets first while energy is high. Volume can come down a notch.",
    };
  }
  if (phase === "bulk") {
    return {
      id: "strategy-bulk",
      severity: "info",
      icon: "🍚",
      title: "Bulk strategy",
      body:
        goal === "hypertrophy"
          ? "More volume, slightly higher reps (8-12), push close to failure. Surplus = recovery fuel for growth."
          : "Add accessories, eat in surplus, sleep 8h. Compounds + recovery = strongest lifts of the year.",
    };
  }
  if (phase === "recomp") {
    return {
      id: "strategy-recomp",
      severity: "info",
      icon: "♻️",
      title: "Recomp strategy",
      body: "Calories at maintenance, protein 2.0 g/kg. Track strength on top sets — that's how you know muscle is replacing fat.",
    };
  }
  return {
    id: "strategy-maintain",
    severity: "info",
    icon: "🧭",
    title: "Maintenance strategy",
    body: "Steady volume, steady food. Use the runway to refine form, sleep, and habits before the next phase.",
  };
}

// ============================================================================
// Convenience: pull everything from the DB and produce insights.
// ============================================================================

export async function loadCoachInsights(): Promise<CoachInsight[] | null> {
  const profile = await db.profile.get("profile");
  if (!profile) return null;
  const weights = await db.bodyWeight.toArray();
  const workouts = await db.workouts.toArray();
  const completed = workouts.filter((w) => w.endedAt !== null);
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000;
  return generateCoachInsights({
    profile,
    weights,
    completedWorkoutsLast7d: completed.filter((w) => w.startedAt >= oneWeekAgo).length,
    completedWorkoutsLast28d: completed.filter((w) => w.startedAt >= fourWeeksAgo).length,
  });
}
