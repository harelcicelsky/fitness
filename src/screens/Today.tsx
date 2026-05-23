import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ensureInit } from "../db/schema";
import {
  addBlock,
  endWorkout,
  getActiveWorkout,
  startWorkout,
  deleteWorkout,
} from "../db/queries";
import { ExercisePicker } from "../components/ExercisePicker";
import { BlockCard } from "../components/BlockCard";
import { HomeHero } from "../components/HomeHero";
import { WorkoutSummary } from "../components/WorkoutSummary";
import { getDailyQuote } from "../lib/dailyQuote";
import type { Workout } from "../types";

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type PickerMode = null | "single-strength" | "superset" | "single-cardio";

export function Today() {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [summaryId, setSummaryId] = useState<string | null>(null);

  const settings = useLiveQuery(() => db.settings.get("settings"), []);
  const blocks = useLiveQuery(
    async () => {
      if (!workout) return [];
      const all = await db.blocks.where("workoutId").equals(workout.id).toArray();
      return all.sort((a, b) => a.order - b.order);
    },
    [workout?.id],
  );

  const liveStats = useLiveQuery(
    async () => {
      if (!workout) return { setCount: 0, volumeKg: 0 };
      const sets = await db.sets.where("workoutId").equals(workout.id).toArray();
      const working = sets.filter((s) => !s.isWarmup);
      const volumeKg = working.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      return { setCount: working.length, volumeKg };
    },
    [workout?.id],
  );

  useEffect(() => {
    ensureInit().then(async () => {
      const active = await getActiveWorkout();
      if (active) setWorkout(active);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!workout) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [workout?.id]);

  if (!ready) {
    return <div className="p-6 text-center text-neutral-500">Loading…</div>;
  }

  if (!workout) {
    return (
      <>
        <HomeHero onStart={async () => setWorkout(await startWorkout())} />
        {summaryId && (
          <WorkoutSummary
            workoutId={summaryId}
            onClose={() => setSummaryId(null)}
          />
        )}
      </>
    );
  }

  const rpeMode = settings?.useRpeOrRir ?? "rpe";

  const handlePick = async (mode: PickerMode, ids: string[]) => {
    if (!workout || ids.length === 0) return;
    if (mode === "superset") {
      await addBlock(workout.id, "superset", ids);
    } else {
      for (const id of ids) {
        await addBlock(workout.id, "single", [id]);
      }
    }
    setPickerMode(null);
  };

  const handleEnd = async () => {
    if (!workout) return;
    if ((blocks ?? []).length === 0) {
      if (!confirm("This workout has no logged sets. Discard it?")) return;
      await deleteWorkout(workout.id);
      setWorkout(null);
    } else {
      const endedId = workout.id;
      await endWorkout(endedId);
      setWorkout(null);
      setSummaryId(endedId);
    }
  };

  const elapsed = now - workout.startedAt;
  const blockCount = (blocks ?? []).length;
  const isEmpty = blockCount === 0;
  const quote = getDailyQuote();

  return (
    <>
      {/* FULL-SCREEN GYM BACKGROUND */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(5,5,5,0.65) 0%, rgba(5,5,5,0.80) 40%, rgba(5,5,5,0.95) 70%, rgba(5,5,5,1) 100%)," +
            "url('/hero.jpg')," +
            "radial-gradient(ellipse at 50% 20%, #111 0%, #050505 80%)",
          backgroundSize: "cover, cover, cover",
          backgroundPosition: "center top, center top, center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Subtle geometric overlay pattern */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(52,211,153,0.3) 60px, rgba(52,211,153,0.3) 61px)," +
            "repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(52,211,153,0.3) 60px, rgba(52,211,153,0.3) 61px)",
        }}
      />

      {/* Ambient glow spots */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 top-20 h-64 w-64 rounded-full bg-emerald-500/8 blur-[100px]" />
        <div className="absolute -right-20 top-1/3 h-48 w-48 rounded-full bg-emerald-400/5 blur-[80px]" />
        <div className="absolute bottom-20 left-1/4 h-40 w-40 rounded-full bg-emerald-500/5 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-xl px-4 pb-48 pt-4">
        {/* ═══════════════════════════════════════════════════════════════════
            HERO TIMER SECTION — centerpiece of the workout
            ═══════════════════════════════════════════════════════════════════ */}
        <header className="relative mb-5 overflow-hidden rounded-2xl backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(20,20,20,0.75) 50%, rgba(15,15,15,0.85) 100%)",
            boxShadow: "0 4px 40px -12px rgba(0,0,0,0.8), inset 0 1px 0 0 rgba(255,255,255,0.05)",
            border: "1px solid rgba(52,211,153,0.12)",
          }}
        >
          {/* Decorative glows */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-emerald-400/5 blur-2xl" />

          <div className="relative p-5">
            {/* Top row: LIVE pill + Discard/End button */}
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-300 ring-1 ring-emerald-500/30"
                style={{ animation: "timer-pulse 2s ease-in-out infinite" }}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live Workout
              </div>
              <button
                onClick={handleEnd}
                className={`flex-none rounded-xl px-4 py-2 text-xs font-bold transition active:scale-95 ${
                  isEmpty
                    ? "bg-neutral-800/80 text-neutral-400 ring-1 ring-neutral-700 hover:bg-neutral-700 hover:text-neutral-200"
                    : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                }`}
              >
                {isEmpty ? "Discard" : "Save & End"}
              </button>
            </div>

            {/* Timer — large, centered */}
            <div className="flex flex-col items-center py-2">
              <div className="font-mono text-5xl font-bold tabular-nums tracking-tight text-white"
                style={{ textShadow: "0 0 40px rgba(52,211,153,0.15)" }}
              >
                {formatElapsed(elapsed)}
              </div>
              <div className="mt-1.5 text-[11px] font-medium text-neutral-500">
                Started{" "}
                {new Date(workout.startedAt).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {/* Stats strip */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-white/5 rounded-xl bg-black/30 ring-1 ring-white/5 backdrop-blur-sm">
              <Stat label="Exercises" value={blockCount} />
              <Stat label="Sets" value={liveStats?.setCount ?? 0} />
              <Stat
                label="Volume"
                value={liveStats?.volumeKg ? Math.round(liveStats.volumeKg) : 0}
                suffix="kg"
              />
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════
            EMPTY STATE — motivational, gym-themed
            ═══════════════════════════════════════════════════════════════════ */}
        {isEmpty && (
          <div className="my-6 flex flex-col items-center justify-center px-4 text-center">
            {/* Animated ring icon */}
            <div className="relative mb-5">
              <div className="absolute -inset-4 rounded-full bg-emerald-500/10 blur-2xl"
                style={{ animation: "timer-pulse 3s ease-in-out infinite" }}
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 ring-2 ring-emerald-500/20 backdrop-blur">
                <DumbbellIcon className="h-12 w-12 text-emerald-400" />
              </div>
            </div>

            <h3 className="text-xl font-bold text-white">Let's Get to Work</h3>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-400">
              Add an exercise, build a superset, or log cardio to begin your session.
            </p>

            {/* Motivational quote */}
            <div className="mt-5 rounded-xl bg-white/[0.03] px-5 py-3 ring-1 ring-white/5 backdrop-blur-sm">
              <p className="text-[12px] italic leading-relaxed text-neutral-400">
                "{quote.text}"
              </p>
              {quote.author !== "—" && (
                <p className="mt-1 text-[10px] font-medium text-neutral-600">— {quote.author}</p>
              )}
            </div>

            {/* Visual separator — three dots */}
            <div className="mt-6 flex items-center gap-1.5">
              <div className="h-1 w-1 rounded-full bg-emerald-500/40" />
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
              <div className="h-1 w-1 rounded-full bg-emerald-500/40" />
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            EXERCISE BLOCKS
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          {(blocks ?? []).map((b) => (
            <BlockCard key={b.id} block={b} rpeMode={rpeMode} />
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          STICKY BOTTOM ACTION BAR — always visible, floating over content
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="fixed left-0 right-0 z-30"
        style={{
          bottom: "calc(64px + var(--safe-bottom, 0px))",
          paddingBottom: "0.5rem",
          background:
            "linear-gradient(to top, rgba(5,5,5,1) 30%, rgba(5,5,5,0.9) 60%, rgba(5,5,5,0) 100%)",
        }}
      >
        <div className="mx-auto max-w-xl px-4 pb-2 pt-4">
          {/* Section label */}
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-600">
              Add to workout
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-700 to-transparent" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <AddButton
              accent="emerald"
              onClick={() => setPickerMode("single-strength")}
              icon={<DumbbellIcon className="h-5 w-5" />}
              label="Exercise"
            />
            <AddButton
              accent="sky"
              onClick={() => setPickerMode("superset")}
              icon={<LinkIcon className="h-5 w-5" />}
              label="Superset"
            />
            <AddButton
              accent="rose"
              onClick={() => setPickerMode("single-cardio")}
              icon={<HeartIcon className="h-5 w-5" />}
              label="Cardio"
            />
          </div>
        </div>
      </div>

      {/* Pickers */}
      <ExercisePicker
        open={pickerMode === "single-strength"}
        onClose={() => setPickerMode(null)}
        onPick={(ids) => handlePick("single-strength", ids)}
        filter="strength"
        title="Add exercise"
      />
      <ExercisePicker
        open={pickerMode === "superset"}
        onClose={() => setPickerMode(null)}
        onPick={(ids) => handlePick("superset", ids)}
        filter="strength"
        multi
        title="Build superset (pick 2+)"
      />
      <ExercisePicker
        open={pickerMode === "single-cardio"}
        onClose={() => setPickerMode(null)}
        onPick={(ids) => handlePick("single-cardio", ids)}
        filter="cardio"
        title="Add cardio"
      />
    </>
  );
}

// ============================================================================
// Small presentational pieces — kept local to this screen
// ============================================================================

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-lg font-bold tabular-nums text-white">
        {value}
        {suffix && <span className="ml-0.5 text-xs font-medium text-neutral-500">{suffix}</span>}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
    </div>
  );
}

const ACCENT_STYLES: Record<
  "emerald" | "sky" | "rose",
  { ring: string; icon: string; bg: string; hoverBg: string; glow: string }
> = {
  emerald: {
    ring: "ring-emerald-500/25",
    icon: "text-emerald-400",
    bg: "bg-emerald-500/8",
    hoverBg: "hover:bg-emerald-500/15",
    glow: "rgba(52,211,153,0.15)",
  },
  sky: {
    ring: "ring-sky-500/25",
    icon: "text-sky-400",
    bg: "bg-sky-500/8",
    hoverBg: "hover:bg-sky-500/15",
    glow: "rgba(56,189,248,0.15)",
  },
  rose: {
    ring: "ring-rose-500/25",
    icon: "text-rose-400",
    bg: "bg-rose-500/8",
    hoverBg: "hover:bg-rose-500/15",
    glow: "rgba(251,113,133,0.15)",
  },
};

function AddButton({
  accent,
  icon,
  label,
  onClick,
}: {
  accent: "emerald" | "sky" | "rose";
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  const s = ACCENT_STYLES[accent];
  return (
    <button
      onClick={onClick}
      className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl ${s.bg} ${s.hoverBg} py-4 ring-1 ${s.ring} backdrop-blur-sm transition-all duration-200 active:scale-[0.96]`}
      style={{ boxShadow: `0 4px 20px -6px ${s.glow}` }}
    >
      <span className={`${s.icon} transition-transform duration-200 group-hover:scale-110`}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300">{label}</span>
    </button>
  );
}

function DumbbellIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="m21 21-1-1" />
      <path d="m3 3 1 1" />
      <path d="m18 22 4-4" />
      <path d="m2 6 4-4" />
      <path d="m3 10 7-7" />
      <path d="m14 21 7-7" />
    </svg>
  );
}

function LinkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function HeartIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
