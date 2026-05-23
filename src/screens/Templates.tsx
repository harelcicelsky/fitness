import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ensureInit } from "../db/schema";
import { TrainingProfileForm } from "../components/TrainingProfileForm";
import { BodyWeightTracker } from "../components/BodyWeightTracker";
import { CoachPanel } from "../components/CoachPanel";
import type { Goal, SplitType, UserProfile, WeightPhase } from "../types";

const PHASE_LABEL: Record<WeightPhase, { label: string; icon: string }> = {
  cut: { label: "Cut", icon: "✂️" },
  bulk: { label: "Bulk", icon: "🍚" },
  recomp: { label: "Recomp", icon: "♻️" },
  maintain: { label: "Maintain", icon: "⚖️" },
};

const SPLIT_LABEL: Record<SplitType, string> = {
  "full-body": "Full Body",
  "upper-lower": "Upper / Lower",
  "ppl": "Push / Pull / Legs",
  "ppl-x2": "PPL ×2",
  "bro-split": "Bro Split",
  "custom": "Custom",
};

const GOAL_LABEL: Record<Goal, string> = {
  strength: "Strength",
  hypertrophy: "Muscle / size",
  general: "General fitness",
  conditioning: "Conditioning",
};

export function Templates() {
  const [editing, setEditing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureInit().then(() => setReady(true));
  }, []);

  // Wrap the result so we can distinguish "still loading" (undefined) from
  // "loaded but no row" (null).
  const profile = useLiveQuery(
    async () => (await db.profile.get("profile")) ?? null,
    [],
  );

  if (!ready || profile === undefined) {
    return <div className="p-6 text-center text-neutral-500">Loading…</div>;
  }

  const isOnboarding = profile === null || profile.completedAt === null;

  if (isOnboarding) {
    return (
      <TrainingProfileForm
        initial={null}
        isOnboarding
        onSaved={() => {
          /* live query updates automatically */
        }}
      />
    );
  }

  if (editing && profile) {
    return (
      <TrainingProfileForm
        initial={profile}
        isOnboarding={false}
        onCancel={() => setEditing(false)}
        onSaved={() => setEditing(false)}
      />
    );
  }

  // After the isOnboarding check above, profile is non-null below.
  if (!profile) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      {/* Screen header with visible accent glow */}
      <div className="relative">
        <div className="pointer-events-none absolute -left-16 -top-12 h-40 w-56 rounded-full bg-emerald-500/15 blur-[80px]" />
        <header className="relative flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Plan & Coach</h2>
            <p className="text-[11px] text-neutral-500">Your training profile & AI insights</p>
          </div>
          <button onClick={() => setEditing(true)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-neutral-300 ring-1 ring-white/8 transition hover:bg-white/10 hover:text-white">
            Edit profile
          </button>
        </header>
      </div>

      {/* Body weight tracker */}
      <BodyWeightTracker />

      {/* AI Coach insights */}
      <CoachPanel />

      <ProfileSummaryCard profile={profile} onEdit={() => setEditing(true)} />

      <div className="card text-sm text-neutral-400">
        <div className="mb-1 font-semibold text-neutral-200">Workout templates</div>
        <p>
          Saved templates (e.g. day A, B, C) live here. Coming next — for now, your
          training profile shapes the recommendations on the Progress tab.
        </p>
      </div>
    </div>
  );
}

function ProfileSummaryCard({
  profile,
  onEdit,
}: {
  profile: UserProfile;
  onEdit: () => void;
}) {
  const splitLetters = profile.splitPattern.split("");
  return (
    <div className="card space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Training profile
          </div>
          <div className="text-base font-semibold">
            {SPLIT_LABEL[profile.splitType]} ·{" "}
            <span className="font-mono tracking-widest">{profile.splitPattern}</span>
          </div>
          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
            <span>{PHASE_LABEL[profile.phase].icon}</span>
            <span>{PHASE_LABEL[profile.phase].label} phase</span>
          </div>
        </div>
        <span
          role="button"
          tabIndex={0}
          onClick={onEdit}
          className="cursor-pointer rounded-md px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
        >
          Change
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat value={`${profile.workoutsPerWeek}×`} label="per week" />
        <Stat value={`${profile.sessionLengthMin}m`} label="per session" />
        <Stat value={profile.experience} label="level" capitalize />
      </div>

      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-wider text-neutral-500">Goal</div>
        <div className="text-sm text-neutral-200">{GOAL_LABEL[profile.goal]}</div>
      </div>

      {profile.splitPattern !== "FULL" && (
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-neutral-500">
            Day rotation
          </div>
          <div className="flex flex-wrap gap-1">
            {splitLetters.map((letter, i) => (
              <span
                key={i}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-800 font-mono text-sm font-semibold text-neutral-200"
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  value,
  label,
  capitalize,
}: {
  value: string;
  label: string;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-xl bg-neutral-800/60 p-3 ring-1 ring-neutral-800">
      <div className={`text-lg font-bold text-neutral-100 truncate ${capitalize ? "capitalize" : ""}`}>
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </div>
    </div>
  );
}
