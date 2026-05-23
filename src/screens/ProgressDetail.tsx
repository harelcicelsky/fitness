import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../db/schema";
import { epley1RM } from "../lib/epley";
import { formatDate } from "../lib/format";
import {
  recommendNextSession,
  type Recommendation,
  type Verdict,
} from "../lib/recommend";
import type { SetEntry } from "../types";

interface Props {
  exerciseId: string;
  onClose: () => void;
}

interface Point {
  date: string;          // YYYY-MM-DD (workout date)
  ts: number;            // epoch sort key
  topWeight: number;     // heaviest weight that day (single set)
  estOneRm: number;      // best estimated 1RM that day
  sets: number;
}

export function ProgressDetail({ exerciseId, onClose }: Props) {
  const recommendations = useLiveQuery(
    () => recommendNextSession(exerciseId),
    [exerciseId],
  );

  const data = useLiveQuery(async () => {
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) return null;

    const allSets: SetEntry[] = await db.sets
      .where("exerciseId")
      .equals(exerciseId)
      .toArray();

    if (allSets.length === 0) {
      return { exercise, points: [], prs: null, totalSets: 0 };
    }

    const workoutIds = Array.from(new Set(allSets.map((s) => s.workoutId)));
    const workouts = await db.workouts.bulkGet(workoutIds);
    const workoutDate = new Map<string, { date: string; ts: number }>();
    workouts.forEach((w) => {
      if (w) workoutDate.set(w.id, { date: w.date, ts: w.startedAt });
    });

    // Group sets by workout, compute per-workout top metrics
    const byWorkout = new Map<string, SetEntry[]>();
    for (const s of allSets) {
      if (s.parentSetId) continue; // exclude drop sets from "top set" calc
      const arr = byWorkout.get(s.workoutId) ?? [];
      arr.push(s);
      byWorkout.set(s.workoutId, arr);
    }

    const points: Point[] = [];
    byWorkout.forEach((sets, wid) => {
      const meta = workoutDate.get(wid);
      if (!meta) return;
      const topWeight = Math.max(...sets.map((s) => s.weightKg));
      const estOneRm = Math.max(...sets.map((s) => epley1RM(s.weightKg, s.reps)));
      points.push({
        date: meta.date,
        ts: meta.ts,
        topWeight,
        estOneRm: Math.round(estOneRm * 10) / 10,
        sets: sets.length,
      });
    });
    points.sort((a, b) => a.ts - b.ts);

    // PRs across all parent sets
    const parentSets = allSets.filter((s) => !s.parentSetId);
    const heaviest = parentSets.reduce((best, s) =>
      s.weightKg > best.weightKg ? s : best,
    );
    const bestVolumeSet = parentSets.reduce((best, s) =>
      s.weightKg * s.reps > best.weightKg * best.reps ? s : best,
    );
    const best1Rm = parentSets.reduce((best, s) =>
      epley1RM(s.weightKg, s.reps) > epley1RM(best.weightKg, best.reps) ? s : best,
    );

    return {
      exercise,
      points,
      totalSets: parentSets.length,
      prs: {
        heaviest,
        bestVolume: bestVolumeSet,
        best1Rm,
        best1RmValue: Math.round(epley1RM(best1Rm.weightKg, best1Rm.reps) * 10) / 10,
      },
    };
  }, [exerciseId]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.points.map((p) => ({
      ...p,
      label: formatDate(p.date),
    }));
  }, [data]);

  if (!data) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <button onClick={onClose} className="btn-ghost py-2 text-sm">
          ← Back
        </button>
        <div className="card text-neutral-400">Loading…</div>
      </div>
    );
  }

  const { exercise, points, prs, totalSets } = data;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="btn-ghost py-2 text-sm">
          ← Back
        </button>
        <span className="text-xs text-neutral-500">
          {points.length} session{points.length === 1 ? "" : "s"} · {totalSets} sets
        </span>
      </div>

      <div className="card space-y-1">
        <div className="text-xs uppercase tracking-wider text-emerald-400/80">
          {exercise.category}
        </div>
        <h2 className="text-xl font-semibold">{exercise.name}</h2>
        <div className="text-xs text-neutral-500">
          {exercise.primaryMuscles.join(" · ")} · {exercise.equipment}
        </div>
      </div>

      {recommendations && (
        <RecommendationCard recs={recommendations} />
      )}

      {points.length === 0 ? (
        <div className="card text-sm text-neutral-400">
          No sets logged for this exercise yet.
        </div>
      ) : (
        <>
          <div className="card">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">Weight over time</h3>
              <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-0.5 w-3 bg-emerald-400" />
                  Top set
                </span>
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block h-0.5 w-3 bg-amber-400"
                    style={{ borderTop: "1px dashed" }}
                  />
                  Est. 1RM
                </span>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#737373"
                    tick={{ fontSize: 11, fill: "#a3a3a3" }}
                    tickMargin={6}
                  />
                  <YAxis
                    stroke="#737373"
                    tick={{ fontSize: 11, fill: "#a3a3a3" }}
                    width={42}
                    unit=" kg"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0a0a",
                      border: "1px solid #404040",
                      borderRadius: 12,
                      color: "#e5e5e5",
                      fontSize: 12,
                    }}
                    formatter={(v: number, name) => [`${v} kg`, name]}
                    labelStyle={{ color: "#a3a3a3" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="topWeight"
                    name="Top set"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#34d399" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="estOneRm"
                    name="Est. 1RM"
                    stroke="#fbbf24"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {prs && (
            <div className="card space-y-2">
              <h3 className="text-sm font-semibold">Personal records</h3>
              <PrRow
                label="Heaviest weight"
                value={`${prs.heaviest.weightKg} kg × ${prs.heaviest.reps}`}
              />
              <PrRow
                label="Best volume set"
                value={`${prs.bestVolume.weightKg} kg × ${prs.bestVolume.reps} = ${Math.round(prs.bestVolume.weightKg * prs.bestVolume.reps).toLocaleString()} kg`}
              />
              <PrRow
                label="Best estimated 1RM"
                value={`${prs.best1RmValue} kg (${prs.best1Rm.weightKg} × ${prs.best1Rm.reps})`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PrRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium text-neutral-100">{value}</span>
    </div>
  );
}

const VERDICT_STYLE: Record<Verdict, { label: string; pillClass: string; arrow: string }> = {
  increase:    { label: "+2.5 kg",  pillClass: "bg-emerald-500/15 text-emerald-400", arrow: "↑" },
  hold:        { label: "Hold",     pillClass: "bg-sky-500/15 text-sky-400",         arrow: "→" },
  decrease:    { label: "−2.5 kg",  pillClass: "bg-amber-500/15 text-amber-400",     arrow: "↓" },
  "first-time":{ label: "Pick one", pillClass: "bg-neutral-700/40 text-neutral-300", arrow: "•" },
};

function RecommendationCard({ recs }: { recs: Recommendation[] }) {
  const allFirstTime = recs.every((r) => r.verdict === "first-time");
  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Next session</h3>
        <span className="text-[11px] text-neutral-500">
          {allFirstTime ? "no history yet" : "based on last session"}
        </span>
      </div>

      <ol className="space-y-2">
        {recs.map((r) => {
          const style = VERDICT_STYLE[r.verdict];
          const showWeight = r.verdict !== "first-time";
          return (
            <li
              key={r.setIndex}
              className="rounded-xl bg-neutral-800/50 p-3 ring-1 ring-neutral-800"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
                  {r.setIndex + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    {showWeight ? (
                      <span className="text-lg font-semibold text-neutral-100">
                        {r.recommendedWeightKg} kg
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-neutral-300">—</span>
                    )}
                    <span className="text-xs text-neutral-500">
                      × {r.target.min}–{r.target.max} reps
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-400">{r.rationale}</p>
                </div>
                <span
                  className={`flex flex-none items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${style.pillClass}`}
                  title={r.verdict}
                >
                  <span>{style.arrow}</span>
                  <span>{style.label}</span>
                </span>
              </div>
              {r.basis && (
                <div className="mt-1 pl-10 text-[11px] text-neutral-500">
                  Last: {r.basis.weightKg} kg × {r.basis.reps} ({formatDate(r.basis.date)})
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
