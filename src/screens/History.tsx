import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { deleteWorkout } from "../db/queries";
import { HistoryDetail } from "./HistoryDetail";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { formatDateTime, formatDuration } from "../lib/format";

interface WorkoutSummary {
  id: string;
  startedAt: number;
  endedAt: number | null;
  totalSets: number;
  totalVolumeKg: number;
  exerciseNames: string[];
  cardioCount: number;
  durationSec: number | null;
}

export function History() {
  const [openId, setOpenId] = useState<string | null>(null);

  const summaries = useLiveQuery(async (): Promise<WorkoutSummary[]> => {
    const workouts = await db.workouts.toArray();
    if (workouts.length === 0) return [];

    // Pre-fetch all sets, cardio, blocks, exercises in bulk to avoid N+1
    const [allSets, allCardio, allBlocks, allExercises] = await Promise.all([
      db.sets.toArray(),
      db.cardioSessions.toArray(),
      db.blocks.toArray(),
      db.exercises.toArray(),
    ]);
    const exMap = new Map(allExercises.map((e) => [e.id, e]));

    return workouts
      .map((w): WorkoutSummary => {
        const sets = allSets.filter((s) => s.workoutId === w.id);
        const cardios = allCardio.filter((c) => c.workoutId === w.id);
        const blocks = allBlocks.filter((b) => b.workoutId === w.id);
        const exerciseIds = new Set<string>();
        blocks.forEach((b) => b.exerciseIds.forEach((id) => exerciseIds.add(id)));
        const exerciseNames = Array.from(exerciseIds)
          .map((id) => exMap.get(id)?.name)
          .filter((n): n is string => !!n);
        const totalVolumeKg = sets.reduce(
          (sum, s) => sum + s.weightKg * s.reps,
          0,
        );
        return {
          id: w.id,
          startedAt: w.startedAt,
          endedAt: w.endedAt,
          totalSets: sets.length,
          totalVolumeKg,
          exerciseNames,
          cardioCount: cardios.length,
          durationSec:
            w.endedAt !== null
              ? Math.round((w.endedAt - w.startedAt) / 1000)
              : null,
        };
      })
      .filter((s) => s.totalSets > 0 || s.cardioCount > 0)
      .sort((a, b) => b.startedAt - a.startedAt);
  }, []);

  const list = useMemo(() => summaries ?? [], [summaries]);

  if (openId) {
    return <HistoryDetail workoutId={openId} onClose={() => setOpenId(null)} />;
  }

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4">
      {/* Screen header with visible accent glow */}
      <div className="relative">
        <div className="pointer-events-none absolute -left-16 -top-12 h-40 w-56 rounded-full bg-sky-500/15 blur-[80px]" />
        <div className="relative flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">History</h2>
            <p className="text-[11px] text-neutral-500">Your training log</p>
          </div>
          {list.length > 0 && (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-bold tabular-nums text-neutral-400 ring-1 ring-white/5">
              {list.length} workout{list.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {/* Activity heatmap */}
      <ActivityHeatmap />

      {list.length === 0 && (
        <div className="card text-sm text-neutral-400">
          No workouts yet. Log a set on the Today tab and it'll show up here.
        </div>
      )}

      {list.map((w) => {
        const inProgress = w.endedAt === null;
        return (
          <button
            key={w.id}
            onClick={() => setOpenId(w.id)}
            className="card flex w-full cursor-pointer flex-col items-stretch gap-2 text-left transition-all duration-200 hover:border-white/10 hover:brightness-110"
          >
            <div className="flex items-baseline justify-between gap-2">
              <div className="font-semibold text-white">{formatDateTime(w.startedAt)}</div>
              {inProgress ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 ring-1 ring-amber-500/20">
                  In progress
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                  Completed
                </span>
              )}
            </div>
            <div className="text-sm text-neutral-400 line-clamp-2">
              {w.exerciseNames.length > 0
                ? w.exerciseNames.join(" · ")
                : "No exercises"}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
              <span>
                <span className="font-semibold text-neutral-300">{w.totalSets}</span> sets
              </span>
              {w.cardioCount > 0 && (
                <span>
                  <span className="font-semibold text-neutral-300">{w.cardioCount}</span> cardio
                </span>
              )}
              <span>
                <span className="font-semibold text-neutral-300">
                  {Math.round(w.totalVolumeKg).toLocaleString()}
                </span>{" "}
                kg vol.
              </span>
              {w.durationSec !== null && (
                <span>
                  <span className="font-semibold text-neutral-300">
                    {formatDuration(w.durationSec)}
                  </span>{" "}
                  duration
                </span>
              )}
            </div>
            <div className="flex justify-end">
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Delete this workout and all its data?")) {
                    deleteWorkout(w.id);
                  }
                }}
                className="cursor-pointer rounded-md px-2 py-1 text-xs text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
              >
                Delete
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
