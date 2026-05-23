import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { ProgressDetail } from "./ProgressDetail";
import { formatDate } from "../lib/format";

interface ExerciseRow {
  id: string;
  name: string;
  category: string;
  primaryMuscles: string[];
  sessions: number;
  totalSets: number;
  lastDate: string;
  lastTs: number;
  topWeight: number;
}

export function Progress() {
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useLiveQuery(async (): Promise<ExerciseRow[]> => {
    const [exercises, sets, workouts] = await Promise.all([
      db.exercises.toArray(),
      db.sets.toArray(),
      db.workouts.toArray(),
    ]);
    if (sets.length === 0) return [];

    const exMap = new Map(exercises.map((e) => [e.id, e]));
    const woMap = new Map(workouts.map((w) => [w.id, w]));

    const byEx = new Map<string, { sets: number; sessions: Set<string>; topWeight: number; lastTs: number; lastDate: string }>();
    for (const s of sets) {
      const cur = byEx.get(s.exerciseId) ?? {
        sets: 0,
        sessions: new Set<string>(),
        topWeight: 0,
        lastTs: 0,
        lastDate: "",
      };
      cur.sets += 1;
      cur.sessions.add(s.workoutId);
      if (s.weightKg > cur.topWeight) cur.topWeight = s.weightKg;
      const w = woMap.get(s.workoutId);
      if (w && w.startedAt > cur.lastTs) {
        cur.lastTs = w.startedAt;
        cur.lastDate = w.date;
      }
      byEx.set(s.exerciseId, cur);
    }

    const out: ExerciseRow[] = [];
    byEx.forEach((data, exId) => {
      const ex = exMap.get(exId);
      if (!ex) return;
      out.push({
        id: ex.id,
        name: ex.name,
        category: ex.category,
        primaryMuscles: ex.primaryMuscles,
        sessions: data.sessions.size,
        totalSets: data.sets,
        lastDate: data.lastDate,
        lastTs: data.lastTs,
        topWeight: data.topWeight,
      });
    });
    out.sort((a, b) => b.lastTs - a.lastTs);
    return out;
  }, []);

  const list = useMemo(() => rows ?? [], [rows]);

  if (openId) {
    return <ProgressDetail exerciseId={openId} onClose={() => setOpenId(null)} />;
  }

  return (
    <>
      {/* Progress screen background image */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(5,5,5,0.45) 0%, rgba(5,5,5,0.55) 30%, rgba(5,5,5,0.78) 60%, rgba(5,5,5,0.95) 85%, rgba(5,5,5,1) 100%)," +
            `url('${import.meta.env.BASE_URL}image-1779575796982.webp')`,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center top",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className="relative z-10 mx-auto max-w-xl space-y-3 p-4">
        {/* Screen header with visible accent glow */}
        <div className="relative">
          <div className="pointer-events-none absolute -right-16 -top-12 h-40 w-56 rounded-full bg-violet-500/15 blur-[80px]" />
          <div className="relative">
            <h2 className="text-xl font-bold text-white">Progress</h2>
            <p className="text-[11px] text-neutral-500">
              Tap an exercise to see weight over time and PRs
            </p>
          </div>
        </div>

        {list.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-violet-400">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-300">No data yet</p>
            <p className="mt-1 text-xs text-neutral-500">Log a few sets and your progress will appear here</p>
          </div>
        )}

        {list.map((r) => (
          <button
            key={r.id}
            onClick={() => setOpenId(r.id)}
            className="card flex w-full cursor-pointer items-center justify-between gap-3 text-left transition-all duration-200 hover:border-white/10 hover:brightness-110"
          >
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{r.name}</div>
              <div className="truncate text-xs text-neutral-500">
                {r.primaryMuscles.join(" · ")}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-400">
                <span>
                  <span className="font-semibold text-neutral-200">{r.sessions}</span> session
                  {r.sessions === 1 ? "" : "s"}
                </span>
                <span>
                  <span className="font-semibold text-neutral-200">{r.totalSets}</span> sets
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400 ring-1 ring-emerald-500/20">
                  top <span className="font-bold">{r.topWeight} kg</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 text-right text-xs text-neutral-500">
              <span>{formatDate(r.lastDate)}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-neutral-600">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
