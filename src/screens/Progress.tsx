import { useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { v4 as uuid } from "uuid";
import { db } from "../db/schema";
import { ProgressDetail } from "./ProgressDetail";
import { formatDate, formatDateTime } from "../lib/format";
import type { BodyWeightEntry } from "../types";

// ============================================================================
// Main Progress Screen
// ============================================================================

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
  const [tab, setTab] = useState<"weight" | "exercises">("weight");

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
      {/* Background */}
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

      <div className="relative z-10 mx-auto max-w-xl space-y-3 p-4 pb-28">
        {/* Header */}
        <div className="relative">
          <div className="pointer-events-none absolute -right-16 -top-12 h-40 w-56 rounded-full bg-violet-500/15 blur-[80px]" />
          <div className="relative">
            <h2 className="text-xl font-bold text-white">Progress</h2>
            <p className="text-[11px] text-neutral-500">
              Track your body weight and exercise PRs
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-neutral-900/60 p-1 ring-1 ring-white/5">
          <button
            onClick={() => setTab("weight")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              tab === "weight"
                ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Body Weight
          </button>
          <button
            onClick={() => setTab("exercises")}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              tab === "exercises"
                ? "bg-violet-500/15 text-violet-400 ring-1 ring-violet-500/30"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            Exercises
          </button>
        </div>

        {tab === "weight" ? (
          <BodyWeightSection />
        ) : (
          <>
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
          </>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Body Weight Section
// ============================================================================

function BodyWeightSection() {
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useLiveQuery(
    () => db.bodyWeight.orderBy("recordedAt").reverse().toArray(),
    [],
  );

  const handleLog = async () => {
    const val = parseFloat(weight);
    if (!val || val <= 0 || val > 500) return;

    setSaving(true);
    const now = Date.now();
    await db.bodyWeight.add({
      id: uuid(),
      date: new Date(now).toISOString().slice(0, 10),
      weightKg: Math.round(val * 10) / 10,
      recordedAt: now,
    });
    setWeight("");
    setSaving(false);
    inputRef.current?.blur();
  };

  const handleDelete = async (id: string) => {
    await db.bodyWeight.delete(id);
  };

  const list = entries ?? [];
  const latest = list[0];
  const previous = list[1];
  const diff = latest && previous ? Math.round((latest.weightKg - previous.weightKg) * 10) / 10 : null;

  return (
    <div className="space-y-4">
      {/* Log weight card */}
      <div className="card relative overflow-hidden">
        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
            Log Body Weight
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                step="0.1"
                min="20"
                max="500"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLog(); }}
                placeholder={latest ? `Last: ${latest.weightKg}` : "e.g. 75.5"}
                className="input w-full pr-10 text-lg font-semibold tabular-nums"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-500">
                kg
              </span>
            </div>
            <button
              onClick={handleLog}
              disabled={saving || !weight.trim()}
              className="btn-primary whitespace-nowrap px-5"
            >
              {saving ? "..." : "Log"}
            </button>
          </div>

          {/* Current weight stats */}
          {latest && (
            <div className="mt-3 flex items-center gap-3 text-xs">
              <span className="text-neutral-500">
                Current: <span className="font-semibold text-white">{latest.weightKg} kg</span>
              </span>
              {diff !== null && diff !== 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ring-1 ${
                    diff < 0
                      ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
                  }`}
                >
                  {diff > 0 ? "+" : ""}{diff} kg
                </span>
              )}
              <span className="text-neutral-600">
                {formatDate(latest.date)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Weight chart */}
      {list.length >= 2 && <WeightChart entries={list} />}

      {/* Weight history */}
      {list.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-600">
              History
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
          </div>

          {list.map((entry) => (
            <div
              key={entry.id}
              className="card flex items-center justify-between"
            >
              <div>
                <span className="text-base font-bold tabular-nums text-white">
                  {entry.weightKg}
                </span>
                <span className="ml-1 text-xs text-neutral-500">kg</span>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  {formatDateTime(entry.recordedAt)}
                </div>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-600 transition hover:bg-neutral-800 hover:text-red-400"
                aria-label="Delete entry"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {list.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
            <ScaleIcon className="h-8 w-8 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-neutral-300">No weigh-ins yet</p>
          <p className="mt-1 max-w-xs text-xs text-neutral-500">
            Log your weight regularly to see your trend over time
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Weight Chart — SVG line graph
// ============================================================================

function WeightChart({ entries }: { entries: BodyWeightEntry[] }) {
  // Show chronological order (oldest → newest), limit to last 30
  const data = useMemo(() => {
    const sorted = [...entries].sort((a, b) => a.recordedAt - b.recordedAt);
    return sorted.slice(-30);
  }, [entries]);

  if (data.length < 2) return null;

  const weights = data.map((d) => d.weightKg);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const padding = range * 0.15;

  const chartW = 320;
  const chartH = 160;
  const padX = 40;
  const padY = 20;
  const innerW = chartW - padX * 2;
  const innerH = chartH - padY * 2;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * innerW,
    y: padY + innerH - ((d.weightKg - minW + padding) / (range + padding * 2)) * innerH,
    weight: d.weightKg,
    date: d.date,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padY + innerH} L ${points[0].x} ${padY + innerH} Z`;

  // Y-axis labels
  const ySteps = 5;
  const yLabels = Array.from({ length: ySteps }, (_, i) => {
    const val = minW - padding + ((range + padding * 2) * (ySteps - 1 - i)) / (ySteps - 1);
    return { y: padY + (i / (ySteps - 1)) * innerH, label: val.toFixed(1) };
  });

  // X-axis labels — show first, middle, and last dates
  const xLabelIndexes = [0, Math.floor(data.length / 2), data.length - 1];

  const first = data[0];
  const last = data[data.length - 1];
  const totalChange = Math.round((last.weightKg - first.weightKg) * 10) / 10;

  return (
    <div className="card relative overflow-hidden">
      <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
            Weight Trend
          </div>
          {totalChange !== 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
                totalChange < 0
                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                  : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
              }`}
            >
              {totalChange > 0 ? "+" : ""}{totalChange} kg
            </span>
          )}
        </div>

        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full"
          style={{ maxHeight: 200 }}
        >
          {/* Grid lines */}
          {yLabels.map((yl, i) => (
            <g key={i}>
              <line
                x1={padX}
                y1={yl.y}
                x2={chartW - padX}
                y2={yl.y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth="0.5"
              />
              <text
                x={padX - 6}
                y={yl.y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize="7"
                fontFamily="monospace"
              >
                {yl.label}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabelIndexes.map((idx) => {
            const p = points[idx];
            if (!p) return null;
            const d = new Date(data[idx].date + "T00:00:00");
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            return (
              <text
                key={idx}
                x={p.x}
                y={chartH - 2}
                textAnchor="middle"
                fill="rgba(255,255,255,0.25)"
                fontSize="7"
                fontFamily="monospace"
              >
                {label}
              </text>
            );
          })}

          {/* Gradient area fill */}
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#weightGrad)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 4px rgba(52,211,153,0.4))" }}
          />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={data.length > 15 ? 2 : 3}
              fill="#34d399"
              stroke="#0a0a0a"
              strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function ScaleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 7v4" />
      <path d="M9 9.5l3-2.5 3 2.5" />
      <circle cx="12" cy="15" r="2" />
    </svg>
  );
}
