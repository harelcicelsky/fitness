import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";

/**
 * GitHub-style activity grid showing the last ~12 weeks of training. Each cell
 * is a calendar day, colored by training volume (or just "did I train" if
 * volume is small).
 *
 * Compact, dense, and a satisfying visual for "am I being consistent?"
 */
export function ActivityHeatmap({ weeks = 16 }: { weeks?: number }) {
  const data = useLiveQuery(async () => {
    const workouts = await db.workouts.toArray();
    const completed = workouts.filter((w) => w.endedAt !== null);
    const sets = await db.sets.toArray();

    // Aggregate volume per day key
    const volPerDay = new Map<string, number>();
    for (const w of completed) {
      const key = toDayKey(w.startedAt);
      volPerDay.set(key, volPerDay.get(key) ?? 0);
    }
    for (const s of sets) {
      if (s.isWarmup) continue;
      // Look up workout via cached map
      const w = workouts.find((x) => x.id === s.workoutId);
      if (!w || w.endedAt === null) continue;
      const key = toDayKey(w.startedAt);
      volPerDay.set(key, (volPerDay.get(key) ?? 0) + s.weightKg * s.reps);
    }
    return volPerDay;
  }, []);

  // Build the grid: weeks columns × 7 rows (Sun..Sat), latest week on the right
  const today = new Date();
  // Anchor on the most recent Saturday (end-of-week)
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const cells: { key: string; date: Date; vol: number; isFuture: boolean }[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const column: { key: string; date: Date; vol: number; isFuture: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(endOfWeek);
      date.setDate(endOfWeek.getDate() - w * 7 - (6 - d));
      const key = toDayKey(date.getTime());
      column.push({
        key,
        date,
        vol: data?.get(key) ?? 0,
        isFuture: date.getTime() > today.getTime(),
      });
    }
    cells.push(column);
  }

  // Find a sensible upper volume for the color scale (95th percentile)
  const volumes = Array.from(data?.values() ?? []).filter((v) => v > 0).sort((a, b) => a - b);
  const p95 = volumes.length > 0 ? volumes[Math.floor(volumes.length * 0.95)] : 1000;

  // Month labels — emit a label at the first column where the month changes
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  cells.forEach((col, i) => {
    const m = col[0].date.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({
        col: i,
        label: col[0].date.toLocaleString(undefined, { month: "short" }),
      });
      lastMonth = m;
    }
  });

  const totalDays = Array.from(data?.values() ?? []).filter((v) => v > 0).length;

  return (
    <div className="card">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-200">Activity</h3>
          <p className="text-[11px] text-neutral-500">
            {totalDays > 0
              ? `${totalDays} training day${totalDays === 1 ? "" : "s"} logged`
              : "Your training grid will fill in as you log workouts."}
          </p>
        </div>
        <Legend />
      </div>

      <div className="flex gap-2">
        {/* Y axis: weekday labels (M, W, F) */}
        <div className="flex flex-col justify-between pb-1 pt-3 text-[9px] text-neutral-600">
          <span>M</span>
          <span>W</span>
          <span>F</span>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-x-auto">
          {/* Month labels row */}
          <div
            className="relative mb-1 h-3 text-[9px] text-neutral-500"
            style={{ width: cells.length * 14 }}
          >
            {monthLabels.map((m) => (
              <span
                key={`${m.col}-${m.label}`}
                className="absolute"
                style={{ left: m.col * 14 }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-[2px]">
            {cells.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-[2px]">
                {col.map((cell) => (
                  <div
                    key={cell.key}
                    title={`${cell.key} — ${cell.vol > 0 ? `${Math.round(cell.vol)} kg` : "rest"}`}
                    className="h-3 w-3 rounded-sm"
                    style={{ background: cellColor(cell.vol, p95, cell.isFuture) }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const samples = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="flex items-center gap-1.5 text-[9px] text-neutral-500">
      <span>less</span>
      {samples.map((s) => (
        <div
          key={s}
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: cellColor(s, 1, false) }}
        />
      ))}
      <span>more</span>
    </div>
  );
}

function cellColor(vol: number, p95: number, isFuture: boolean): string {
  if (isFuture) return "rgba(38,38,38,0.4)";
  if (vol <= 0) return "#262626"; // neutral-800
  const t = Math.min(1, vol / p95);
  // Map t (0..1) onto an emerald ramp
  if (t < 0.25) return "#064e3b"; // emerald-900
  if (t < 0.5) return "#065f46";  // emerald-800
  if (t < 0.75) return "#047857"; // emerald-700
  if (t < 0.95) return "#10b981"; // emerald-500
  return "#34d399";               // emerald-400
}

function toDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
