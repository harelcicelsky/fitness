import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { loadCoachInsights, type CoachInsight, type CoachSeverity } from "../lib/coach";

const SEVERITY_STYLES: Record<CoachSeverity, { ring: string; bg: string; text: string }> = {
  good: { ring: "ring-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-300" },
  info: { ring: "ring-sky-500/30", bg: "bg-sky-500/10", text: "text-sky-300" },
  warn: { ring: "ring-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-300" },
  bad: { ring: "ring-rose-500/40", bg: "bg-rose-500/10", text: "text-rose-300" },
};

interface Props {
  /** Limit the number of cards shown — useful on the home screen. */
  limit?: number;
  /** Compact mode hides body text — cards become single-line chips. */
  compact?: boolean;
}

/**
 * Renders the "AI Coach" insights. Recomputes on every DB change so the panel
 * stays in sync as the user logs weights / sessions.
 */
export function CoachPanel({ limit, compact = false }: Props) {
  // useLiveQuery here triggers recomputation whenever bodyWeight, workouts, or
  // profile change. We pass a stable function that calls our loader.
  const trigger = useLiveQuery(async () => {
    const [w, b, p] = await Promise.all([
      db.workouts.count(),
      db.bodyWeight.count(),
      db.profile.count(),
    ]);
    return `${w}-${b}-${p}-${Date.now() / 60_000 | 0}`;
  }, []);

  const [insights, setInsights] = useState<CoachInsight[] | null>(null);

  useEffect(() => {
    let cancel = false;
    loadCoachInsights().then((r) => {
      if (!cancel) setInsights(r);
    });
    return () => {
      cancel = true;
    };
  }, [trigger]);

  if (!insights) {
    return null;
  }

  if (insights.length === 0) {
    return (
      <div className="card text-sm text-neutral-400">
        Set up your profile to unlock coaching.
      </div>
    );
  }

  const shown = limit ? insights.slice(0, limit) : insights;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 ring-1 ring-emerald-500/30">
          <SparkIcon className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold text-neutral-200">AI Coach</h3>
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">
          {insights.length} insight{insights.length === 1 ? "" : "s"}
        </span>
      </div>

      {shown.map((ins) => {
        const s = SEVERITY_STYLES[ins.severity];
        return (
          <div
            key={ins.id}
            className={`rounded-2xl ${s.bg} p-3 ring-1 ${s.ring}`}
          >
            <div className="flex items-start gap-2">
              <span className="text-base leading-tight" aria-hidden>
                {ins.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <div className={`text-sm font-semibold ${s.text}`}>{ins.title}</div>
                  {ins.metric && (
                    <span className={`flex-none rounded-full bg-neutral-950/50 px-2 py-0.5 text-[10px] font-bold tabular-nums ${s.text}`}>
                      {ins.metric}
                    </span>
                  )}
                </div>
                {!compact && (
                  <p className="mt-1 text-xs leading-relaxed text-neutral-400">{ins.body}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
