import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { formatDate } from "../lib/format";
import { Avatar } from "./Avatar";
import { computeAvatarStats, MAX_LEVEL } from "../lib/avatarLevel";
import { computeStreak } from "../lib/streak";
import { getDailyQuote } from "../lib/dailyQuote";
import { CoachPanel } from "./CoachPanel";
import type { AvatarLook } from "../types";

const DEFAULT_AVATAR: AvatarLook = {
  skinTone: "tone3",
  hairStyle: "short",
  hairColor: "#3a2d20",
  outfitColor: "#1f2937",
  build: "masc",
};

interface Props {
  onStart: () => void | Promise<void>;
}

interface Stats {
  lastWorkoutDate: string | null;
  daysSince: number | null;
  totalWorkouts: number;
  weekCount: number;
}

export function HomeHero({ onStart }: Props) {
  const profile = useLiveQuery(
    async () => (await db.profile.get("profile")) ?? null,
    [],
  );

  const avatarStats = useLiveQuery(
    () => computeAvatarStats(profile?.workoutsPerWeek ?? 4),
    [profile?.workoutsPerWeek],
  );

  const stats = useLiveQuery(async (): Promise<Stats> => {
    const workouts = await db.workouts.toArray();
    const completed = workouts
      .filter((w) => w.endedAt !== null)
      .sort((a, b) => b.startedAt - a.startedAt);
    const last = completed[0];
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const weekCount = completed.filter((w) => w.startedAt >= oneWeekAgo).length;
    const daysSince = last
      ? Math.floor((now - last.startedAt) / (24 * 60 * 60 * 1000))
      : null;
    return {
      lastWorkoutDate: last?.date ?? null,
      daysSince,
      totalWorkouts: completed.length,
      weekCount,
    };
  }, []);

  const streak = useLiveQuery(() => computeStreak(), []);
  const quote = getDailyQuote();

  const muscleLevel = avatarStats?.muscleLevel ?? 0;
  const fallingBehind = avatarStats?.fallingBehind ?? false;

  return (
    <div
      className="relative -m-0 flex min-h-full flex-col bg-neutral-950"
      style={{
        // Layered backgrounds (top → bottom of stack):
        //   1. Vertical fade — light at top, darker toward the bottom so the
        //      Start Workout button area reads cleanly
        //   2. The gym photo at /hero.jpg, full cover
        //   3. Radial fallback if the image is missing
        backgroundImage:
          "linear-gradient(to bottom, rgba(10,10,10,0.35) 0%, rgba(10,10,10,0.55) 50%, rgba(10,10,10,0.95) 100%)," +
          `url('${import.meta.env.BASE_URL}hero.jpg'),` +
          "radial-gradient(ellipse at center, #1a1a1a 0%, #050505 80%)",
        backgroundSize: "cover, cover, cover",
        backgroundPosition: "center, center, center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* AVATAR — full-bleed centerpiece behind the text */}
      <div className="pointer-events-none absolute inset-x-0 bottom-32 top-32 flex items-end justify-center">
        {/* glow puddle under the avatar */}
        <div
          className="absolute bottom-2 h-6 w-44 rounded-full bg-emerald-400/20 blur-2xl"
          style={{ animation: "avatar-breathe 3.6s ease-in-out infinite" }}
        />
        <Avatar
          look={profile?.avatar ?? DEFAULT_AVATAR}
          level={muscleLevel}
          size={420}
          className="drop-shadow-[0_10px_24px_rgba(0,0,0,0.6)]"
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pt-10">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Today
            </div>
            {streak && streak.current > 0 && (
              <div
                className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-[11px] font-bold text-orange-300 ring-1 ring-orange-500/40 backdrop-blur"
                title={`Best streak: ${streak.best} day${streak.best === 1 ? "" : "s"}`}
              >
                <span
                  className="inline-block"
                  style={{ animation: "flame-flicker 1.4s ease-in-out infinite" }}
                >
                  🔥
                </span>
                <span className="tabular-nums">{streak.current}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wider text-orange-300/80">
                  day{streak.current === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {profile?.name
              ? `Welcome back, ${profile.name}`
              : "Time to lift."}
          </h1>
          <p className="max-w-sm text-sm text-neutral-300 drop-shadow">
            {stats?.lastWorkoutDate
              ? `Last session: ${formatDate(stats.lastWorkoutDate)}${
                  stats.daysSince !== null
                    ? ` · ${stats.daysSince === 0 ? "today" : `${stats.daysSince}d ago`}`
                    : ""
                }`
              : "No history yet — let's start logging."}
          </p>
          {/* Daily motivational quote — small, italic, drop-shadowed */}
          <p className="max-w-sm pt-1 text-[12px] italic leading-relaxed text-neutral-400 drop-shadow">
            "{quote.text}"
            {quote.author !== "—" && (
              <span className="ml-1 not-italic text-neutral-500"> — {quote.author}</span>
            )}
          </p>

          {/* Top coach insight — only the highest-priority one, compact */}
          {profile && (
            <div className="mt-3">
              <CoachPanel limit={1} compact />
            </div>
          )}

          {profile && avatarStats && (
            <div className="mt-3 inline-flex flex-col gap-1">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-neutral-950/70 px-3 py-1 ring-1 ring-neutral-800 backdrop-blur">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Lvl {muscleLevel}
                </span>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{
                      width: `${Math.round(((muscleLevel % 1) || (muscleLevel === MAX_LEVEL ? 1 : (avatarStats.totalCompleted % 5) / 5)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500">
                  {muscleLevel >= MAX_LEVEL
                    ? "MAX"
                    : `${avatarStats.toNextLevel} to lvl ${muscleLevel + 1}`}
                </span>
              </div>
              {fallingBehind && (
                <div className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] text-amber-300 ring-1 ring-amber-500/40">
                  ⚠ Behind your weekly target — get back in.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        className="sticky bottom-0 z-20 mx-auto w-full max-w-xl px-5 pb-6 pt-12"
        style={{
          paddingBottom: "calc(1.5rem + var(--safe-bottom))",
          background:
            "linear-gradient(to top, rgba(10,10,10,1) 30%, rgba(10,10,10,0.4) 80%, rgba(10,10,10,0) 100%)",
        }}
      >
        <button
          onClick={onStart}
          className="btn-primary w-full py-5 text-base font-semibold shadow-[0_8px_30px_-8px_rgba(52,211,153,0.6)]"
        >
          Start Workout
        </button>
        {stats && stats.totalWorkouts > 0 && (
          <p className="mt-3 text-center text-[11px] text-neutral-500">
            {stats.weekCount} this week · {stats.totalWorkouts} total
          </p>
        )}
      </div>
    </div>
  );
}

