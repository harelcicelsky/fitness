import { useEffect, useState } from "react";
import { db } from "../db/schema";
import { epley1RM } from "../lib/epley";
import { formatDuration } from "../lib/format";

interface PRHit {
  exerciseName: string;
  kind: "weight" | "1rm" | "volume";
  value: number;
  prev: number;
}

interface SummaryData {
  durationSec: number;
  totalSets: number;
  totalVolumeKg: number;
  exerciseCount: number;
  prHits: PRHit[];
}

interface Props {
  workoutId: string;
  onClose: () => void;
}

/**
 * Celebration screen shown after a workout is saved. Computes the session's
 * totals AND scans for any PRs that were set during this workout (top weight,
 * top estimated 1RM, top single-set volume per exercise — compared against the
 * exercise's history excluding this session).
 *
 * Visually: dark backdrop, animated emerald glow, tabular stat readout, and a
 * shower of confetti-style emerald dots if any PRs landed.
 */
export function WorkoutSummary({ workoutId, onClose }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    (async () => {
      const w = await db.workouts.get(workoutId);
      if (!w || w.endedAt === null) return;

      const allSets = await db.sets.toArray();
      const allExercises = await db.exercises.toArray();
      const exMap = new Map(allExercises.map((e) => [e.id, e]));

      const sessionSets = allSets.filter((s) => s.workoutId === workoutId && !s.isWarmup);
      const historicalSets = allSets.filter((s) => s.workoutId !== workoutId && !s.isWarmup);

      const totalVolumeKg = sessionSets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);

      // PR scan — group both pools by exerciseId
      const byExSession = new Map<string, typeof sessionSets>();
      for (const s of sessionSets) {
        const arr = byExSession.get(s.exerciseId) ?? [];
        arr.push(s);
        byExSession.set(s.exerciseId, arr);
      }
      const byExHistory = new Map<string, typeof historicalSets>();
      for (const s of historicalSets) {
        const arr = byExHistory.get(s.exerciseId) ?? [];
        arr.push(s);
        byExHistory.set(s.exerciseId, arr);
      }

      const prHits: PRHit[] = [];
      for (const [exId, sets] of byExSession.entries()) {
        const name = exMap.get(exId)?.name ?? "Exercise";
        const history = byExHistory.get(exId) ?? [];

        // Top weight (must have >0 reps)
        const topWeightSession = Math.max(...sets.map((s) => s.weightKg));
        const topWeightHistory = history.length > 0 ? Math.max(...history.map((s) => s.weightKg)) : 0;
        if (topWeightSession > topWeightHistory && topWeightSession > 0) {
          prHits.push({
            exerciseName: name,
            kind: "weight",
            value: topWeightSession,
            prev: topWeightHistory,
          });
        }

        // Top estimated 1RM
        const top1rmSession = Math.max(...sets.map((s) => epley1RM(s.weightKg, s.reps)));
        const top1rmHistory =
          history.length > 0
            ? Math.max(...history.map((s) => epley1RM(s.weightKg, s.reps)))
            : 0;
        if (top1rmSession > top1rmHistory && top1rmSession > 0) {
          // Skip if we already flagged a weight PR for the same exercise — too noisy
          if (!prHits.find((p) => p.exerciseName === name)) {
            prHits.push({
              exerciseName: name,
              kind: "1rm",
              value: top1rmSession,
              prev: top1rmHistory,
            });
          }
        }
      }

      setData({
        durationSec: Math.round((w.endedAt - w.startedAt) / 1000),
        totalSets: sessionSets.length,
        totalVolumeKg,
        exerciseCount: byExSession.size,
        prHits,
      });
    })();
  }, [workoutId]);

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur">
        <div className="text-sm text-neutral-400">Saving session…</div>
      </div>
    );
  }

  const hasPRs = data.prHits.length > 0;
  const verdict = pickVerdict(data, hasPRs);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-neutral-950/90 p-4 backdrop-blur sm:items-center">
      <div className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl bg-neutral-900 ring-1 ring-neutral-800">
        {/* Animated background glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 30% 0%, rgba(52,211,153,0.18), transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(56,189,248,0.12), transparent 60%)",
          }}
        />
        {/* Confetti — only if PRs */}
        {hasPRs && <Confetti />}

        <div className="relative p-6">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Session complete
          </div>
          <h2 className="text-2xl font-bold text-white">{verdict.title}</h2>
          <p className="mt-1 text-sm text-neutral-400">{verdict.subtitle}</p>

          {/* Stats grid */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <StatTile label="Duration" value={formatDuration(data.durationSec)} />
            <StatTile label="Exercises" value={data.exerciseCount.toString()} />
            <StatTile label="Sets" value={data.totalSets.toString()} />
            <StatTile
              label="Volume"
              value={Math.round(data.totalVolumeKg).toLocaleString()}
              suffix="kg"
            />
          </div>

          {/* PRs */}
          {hasPRs && (
            <div className="mt-4 rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/30">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <h3 className="text-sm font-bold text-emerald-300">
                  {data.prHits.length} new PR{data.prHits.length === 1 ? "" : "s"}
                </h3>
              </div>
              <ul className="space-y-1.5">
                {data.prHits.slice(0, 5).map((pr, i) => (
                  <li key={i} className="flex items-baseline justify-between text-xs">
                    <span className="text-neutral-200">{pr.exerciseName}</span>
                    <span className="text-emerald-300">
                      {pr.kind === "weight" && `${pr.value} kg`}
                      {pr.kind === "1rm" && `${Math.round(pr.value)} kg e1RM`}
                      {pr.kind === "volume" && `${Math.round(pr.value)} kg vol`}
                      {pr.prev > 0 && (
                        <span className="ml-1 text-[10px] text-emerald-500/70">
                          +{((pr.value - pr.prev) / pr.prev * 100).toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={onClose}
            className="btn-primary mt-6 w-full py-4 text-base font-semibold shadow-[0_8px_30px_-8px_rgba(52,211,153,0.6)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl bg-neutral-950/70 p-3 ring-1 ring-neutral-800">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-0.5 text-xl font-bold tabular-nums text-white">
        {value}
        {suffix && <span className="ml-1 text-xs font-medium text-neutral-500">{suffix}</span>}
      </div>
    </div>
  );
}

function pickVerdict(data: SummaryData, hasPRs: boolean): { title: string; subtitle: string } {
  if (hasPRs) {
    return {
      title: "Personal records broken.",
      subtitle: "You moved heavier than ever. Lock it in and recover.",
    };
  }
  if (data.totalVolumeKg > 5000) {
    return {
      title: "Huge volume day.",
      subtitle: "That's serious work. Eat, hydrate, sleep.",
    };
  }
  if (data.durationSec < 30 * 60) {
    return {
      title: "Quick & sharp.",
      subtitle: "Short, focused, in and out. Showed up — that's what counts.",
    };
  }
  if (data.exerciseCount >= 5) {
    return {
      title: "Solid full session.",
      subtitle: "You hit a lot of patterns. Variety builds resilience.",
    };
  }
  return {
    title: "Nice work.",
    subtitle: "Logged and saved. Consistency compounds — see you tomorrow.",
  };
}

function Confetti() {
  // 30 colored dots floating up from the bottom with staggered delays
  const dots = Array.from({ length: 28 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    duration: 1.8 + Math.random() * 1.6,
    size: 4 + Math.random() * 5,
    color: ["#34d399", "#10b981", "#a7f3d0", "#7dd3fc", "#fbbf24"][i % 5],
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((d) => (
        <span
          key={d.id}
          className="absolute rounded-full"
          style={{
            left: `${d.left}%`,
            bottom: "-10px",
            width: d.size,
            height: d.size,
            background: d.color,
            animation: `confetti-rise ${d.duration}s ease-out ${d.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}
