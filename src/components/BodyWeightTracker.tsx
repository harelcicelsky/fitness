import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { addBodyWeight, deleteBodyWeight } from "../db/queries";

/**
 * Compact body-weight logger. Header shows current weight, change vs 7 days
 * ago, and a minimal sparkline. Tapping the card expands an input + history
 * list with delete buttons.
 */
export function BodyWeightTracker() {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<string>("");

  const entries = useLiveQuery(async () => {
    const all = await db.bodyWeight.toArray();
    return all.sort((a, b) => b.recordedAt - a.recordedAt);
  }, []);

  const profile = useLiveQuery(() => db.profile.get("profile"), []);

  const list = entries ?? [];
  const current = list[0];
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekRef = list.find((e) => e.recordedAt <= oneWeekAgo) ?? list[list.length - 1];
  const weekDelta = current && weekRef && weekRef !== current
    ? current.weightKg - weekRef.weightKg
    : null;

  const save = async () => {
    const num = parseFloat(draft);
    if (!Number.isFinite(num) || num <= 0) return;
    await addBodyWeight(Math.round(num * 10) / 10);
    setDraft("");
  };

  // Sparkline data — chronological, last 30 days
  const thirtyAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const sparkPoints = [...list]
    .reverse()
    .filter((e) => e.recordedAt >= thirtyAgo);

  const target = profile?.targetWeightKg ?? null;
  const phase = profile?.phase ?? "maintain";

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            Bodyweight
          </div>
          <div className="mt-0.5 flex items-baseline gap-2">
            {current ? (
              <>
                <span className="text-2xl font-bold tabular-nums text-white">
                  {current.weightKg.toFixed(1)}
                </span>
                <span className="text-xs text-neutral-500">kg</span>
                {weekDelta !== null && (
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      weekDelta > 0 ? "text-amber-400" : weekDelta < 0 ? "text-sky-400" : "text-neutral-400"
                    }`}
                  >
                    {weekDelta > 0 ? "+" : ""}
                    {weekDelta.toFixed(1)} <span className="text-[10px] font-normal text-neutral-500">/7d</span>
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-neutral-400">No entries yet</span>
            )}
          </div>
          {target !== null && current && (
            <div className="mt-0.5 text-[11px] text-neutral-500">
              Target: {target} kg · {Math.abs(current.weightKg - target).toFixed(1)} kg to go
            </div>
          )}
          {!current && (
            <div className="mt-0.5 text-[11px] text-neutral-500">
              Phase: {phase.toUpperCase()} — log your weight to unlock coaching
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-none rounded-lg bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 ring-1 ring-neutral-700 hover:bg-neutral-700"
        >
          {expanded ? "Close" : "+ Log"}
        </button>
      </div>

      {/* Sparkline */}
      {sparkPoints.length >= 2 && (
        <div className="mt-3">
          <Sparkline points={sparkPoints.map((p) => p.weightKg)} target={target} />
        </div>
      )}

      {/* Expanded log */}
      {expanded && (
        <div className="mt-4 border-t border-neutral-800 pt-3">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="number"
              inputMode="decimal"
              step="0.1"
              placeholder="Weight in kg"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              className="input flex-1"
            />
            <button onClick={save} className="btn-primary px-4 py-3 text-sm">
              Save
            </button>
          </div>
          {list.length > 0 && (
            <div className="mt-3 max-h-48 space-y-1 overflow-y-auto">
              {list.slice(0, 12).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-950/60 px-3 py-2 text-xs"
                >
                  <span className="text-neutral-300">
                    <span className="tabular-nums font-semibold text-white">
                      {e.weightKg.toFixed(1)}
                    </span>{" "}
                    kg
                  </span>
                  <span className="text-neutral-500">
                    {new Date(e.recordedAt).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <button
                    onClick={() => deleteBodyWeight(e.id)}
                    className="rounded px-1.5 py-0.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Sparkline({ points, target }: { points: number[]; target: number | null }) {
  const w = 280;
  const h = 36;
  const pad = 2;
  const min = Math.min(...points, target ?? Infinity);
  const max = Math.max(...points, target ?? -Infinity);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(1, points.length - 1);
  const y = (v: number) => h - pad - ((v - min) / range) * (h - pad * 2);

  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${pad + i * stepX} ${y(v)}`)
    .join(" ");

  const targetY = target !== null ? y(target) : null;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      {targetY !== null && (
        <line
          x1={0}
          y1={targetY}
          x2={w}
          y2={targetY}
          stroke="#7dd3fc"
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.5"
        />
      )}
      <path d={path} fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pad + (points.length - 1) * stepX} cy={y(points[points.length - 1])} r="3" fill="#34d399" />
    </svg>
  );
}
