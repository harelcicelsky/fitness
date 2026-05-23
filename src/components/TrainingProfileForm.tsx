import { useState } from "react";
import { db } from "../db/schema";
import { AvatarCustomizer } from "./AvatarCustomizer";
import type {
  AvatarLook,
  Experience,
  Goal,
  SplitType,
  UserProfile,
  WeightPhase,
} from "../types";

const DEFAULT_AVATAR: AvatarLook = {
  skinTone: "tone3",
  hairStyle: "short",
  hairColor: "#3a2d20",
  outfitColor: "#1f2937",
  build: "masc",
};

const PHASE_OPTIONS: { value: WeightPhase; label: string; blurb: string; icon: string }[] = [
  { value: "cut",      label: "Cut / Fat loss",     blurb: "Eating in a deficit. Goal: lose weight while keeping muscle.", icon: "✂️" },
  { value: "bulk",     label: "Bulk / Mass plan",   blurb: "Eating in a surplus. Goal: gain muscle and strength.",          icon: "🍚" },
  { value: "recomp",   label: "Recomp",             blurb: "Maintenance calories. Lose fat + gain muscle simultaneously.",  icon: "♻️" },
  { value: "maintain", label: "Maintain",           blurb: "Hold current weight. Focus on performance & habits.",           icon: "⚖️" },
];

interface Props {
  initial?: UserProfile | null;
  isOnboarding: boolean;
  onCancel?: () => void;
  onSaved: () => void;
}

interface SplitOption {
  type: SplitType;
  pattern: string;
  label: string;
  blurb: string;
  daysPerWeek: number;
}

const SPLIT_OPTIONS: SplitOption[] = [
  {
    type: "full-body",
    pattern: "FULL",
    label: "Full Body",
    blurb: "Same workout every session — hits all major muscles each time.",
    daysPerWeek: 3,
  },
  {
    type: "upper-lower",
    pattern: "AB",
    label: "Upper / Lower (AB)",
    blurb: "A = upper body, B = lower body. Alternate.",
    daysPerWeek: 4,
  },
  {
    type: "ppl",
    pattern: "ABC",
    label: "Push / Pull / Legs (ABC)",
    blurb: "A = push, B = pull, C = legs. Run once per week.",
    daysPerWeek: 3,
  },
  {
    type: "ppl-x2",
    pattern: "ABCABC",
    label: "PPL ×2 (ABCABC)",
    blurb: "Push / Pull / Legs hit twice a week. Higher frequency.",
    daysPerWeek: 6,
  },
  {
    type: "bro-split",
    pattern: "ABCDE",
    label: "Bro Split (ABCDE)",
    blurb: "Chest / back / legs / shoulders / arms. One muscle per day.",
    daysPerWeek: 5,
  },
  {
    type: "custom",
    pattern: "AABC",
    label: "Custom letters",
    blurb: "Type your own pattern (e.g. AABC, ABCAB, ABCBCA).",
    daysPerWeek: 4,
  },
];

const GOALS: { value: Goal; label: string; blurb: string }[] = [
  { value: "strength",     label: "Strength",        blurb: "Heavier weights, lower reps, longer rest." },
  { value: "hypertrophy",  label: "Muscle / size",   blurb: "Moderate weights, 6–12 reps, hit volume." },
  { value: "general",      label: "General fitness", blurb: "Balanced — feel good, move well." },
  { value: "conditioning", label: "Conditioning",    blurb: "Endurance, work capacity, cardio focus." },
];

const EXPERIENCE: { value: Experience; label: string; blurb: string }[] = [
  { value: "beginner",     label: "Beginner",     blurb: "<1 year of consistent training." },
  { value: "intermediate", label: "Intermediate", blurb: "1–3 years, lifts are climbing steadily." },
  { value: "advanced",     label: "Advanced",     blurb: "3+ years, progress is slower and harder-earned." },
];

const SESSION_LENGTHS = [30, 45, 60, 75, 90];

export function TrainingProfileForm({ initial, isOnboarding, onCancel, onSaved }: Props) {
  const [name, setName] = useState<string>(initial?.name ?? "");
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState<number>(initial?.workoutsPerWeek ?? 4);
  const [splitType, setSplitType] = useState<SplitType>(initial?.splitType ?? "ppl");
  const [splitPattern, setSplitPattern] = useState<string>(initial?.splitPattern ?? "ABC");
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "hypertrophy");
  const [experience, setExperience] = useState<Experience>(initial?.experience ?? "intermediate");
  const [sessionLengthMin, setSessionLengthMin] = useState<number>(initial?.sessionLengthMin ?? 60);
  const [avatar, setAvatar] = useState<AvatarLook>(initial?.avatar ?? DEFAULT_AVATAR);
  const [phase, setPhase] = useState<WeightPhase>(initial?.phase ?? "maintain");
  const [startingWeight, setStartingWeight] = useState<string>(
    initial?.startingWeightKg !== null && initial?.startingWeightKg !== undefined
      ? String(initial.startingWeightKg)
      : "",
  );
  const [targetWeight, setTargetWeight] = useState<string>(
    initial?.targetWeightKg !== null && initial?.targetWeightKg !== undefined
      ? String(initial.targetWeightKg)
      : "",
  );
  const [heightCm, setHeightCm] = useState<string>(
    initial?.heightCm !== null && initial?.heightCm !== undefined
      ? String(initial.heightCm)
      : "",
  );
  const [saving, setSaving] = useState(false);

  const onSplitPick = (opt: SplitOption) => {
    setSplitType(opt.type);
    setSplitPattern(opt.pattern);
  };

  const onPatternChange = (raw: string) => {
    // Allow only A–Z, uppercase, max 10 characters
    const clean = raw.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 10);
    setSplitPattern(clean);
    setSplitType("custom");
  };

  const handleSave = async () => {
    setSaving(true);
    const parseNum = (s: string): number | null => {
      const v = parseFloat(s);
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    const profile: UserProfile = {
      id: "profile",
      completedAt: Date.now(),
      name: name.trim(),
      workoutsPerWeek,
      splitType,
      splitPattern: splitPattern || "FULL",
      goal,
      experience,
      sessionLengthMin,
      avatar,
      phase,
      startingWeightKg: parseNum(startingWeight),
      targetWeightKg: parseNum(targetWeight),
      heightCm: parseNum(heightCm),
    };
    await db.profile.put(profile);

    // If this is the first time we're saving + a starting weight was given,
    // seed the body-weight log so the trend has a baseline.
    if (isOnboarding && profile.startingWeightKg) {
      const existing = await db.bodyWeight.count();
      if (existing === 0) {
        const { addBodyWeight } = await import("../db/queries");
        await addBodyWeight(profile.startingWeightKg);
      }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <header className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
          {isOnboarding ? "Quick setup" : "Training profile"}
        </div>
        <h2 className="text-2xl font-bold">
          {isOnboarding ? "Tell me how you train." : "Edit your training profile."}
        </h2>
        <p className="text-sm text-neutral-400">
          {isOnboarding
            ? "A few quick questions. Helps me tailor recommendations to your routine. You can change everything later."
            : "Update anything that's changed. Recommendations recalc automatically."}
        </p>
      </header>

      {/* 1. Name */}
      <Section
        number={1}
        title="What's your name?"
        hint="So we can greet you properly."
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          className="input text-base"
          autoComplete="given-name"
        />
      </Section>

      {/* 2. Workouts per week */}
      <Section
        number={2}
        title="How many workouts per week?"
        hint="Realistic average — not the dream."
      >
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const active = workoutsPerWeek === n;
            return (
              <button
                key={n}
                onClick={() => setWorkoutsPerWeek(n)}
                className={`rounded-xl py-3 text-base font-semibold ring-1 transition ${
                  active
                    ? "bg-emerald-400 text-neutral-950 ring-emerald-400"
                    : "bg-neutral-900 text-neutral-300 ring-neutral-800 hover:bg-neutral-800"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 3. Split */}
      <Section
        number={3}
        title="What's your training split?"
        hint="ABC means a 3-day rotation. AABC means day A twice, then B, then C."
      >
        <div className="space-y-2">
          {SPLIT_OPTIONS.map((opt) => {
            const active = splitType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => onSplitPick(opt)}
                className={`flex w-full items-start justify-between gap-3 rounded-xl p-3 text-left ring-1 transition ${
                  active
                    ? "bg-emerald-500/10 ring-emerald-500"
                    : "bg-neutral-900 ring-neutral-800 hover:bg-neutral-800"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{opt.label}</span>
                    <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] tracking-widest text-neutral-300">
                      {opt.pattern}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">{opt.blurb}</div>
                </div>
                <span
                  className={`mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs ring-1 ${
                    active
                      ? "bg-emerald-400 text-neutral-950 ring-emerald-400"
                      : "ring-neutral-700"
                  }`}
                >
                  {active ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </div>
        {splitType === "custom" && (
          <div className="mt-3">
            <label className="mb-1 block text-[11px] uppercase tracking-wider text-neutral-500">
              Your pattern (letters A–Z)
            </label>
            <input
              value={splitPattern}
              onChange={(e) => onPatternChange(e.target.value)}
              placeholder="ABCAB"
              className="input font-mono tracking-[0.3em]"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Each letter is a unique workout day. Repeat letters to repeat days.
            </p>
          </div>
        )}
      </Section>

      {/* 4. Goal */}
      <Section number={4} title="Primary goal?">
        <div className="grid gap-2 sm:grid-cols-2">
          {GOALS.map((g) => {
            const active = goal === g.value;
            return (
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`rounded-xl p-3 text-left ring-1 transition ${
                  active
                    ? "bg-emerald-500/10 ring-emerald-500"
                    : "bg-neutral-900 ring-neutral-800 hover:bg-neutral-800"
                }`}
              >
                <div className="font-semibold">{g.label}</div>
                <div className="text-xs text-neutral-400">{g.blurb}</div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 5. Experience */}
      <Section number={5} title="Lifting experience?">
        <div className="space-y-2">
          {EXPERIENCE.map((e) => {
            const active = experience === e.value;
            return (
              <button
                key={e.value}
                onClick={() => setExperience(e.value)}
                className={`flex w-full items-baseline justify-between rounded-xl p-3 text-left ring-1 transition ${
                  active
                    ? "bg-emerald-500/10 ring-emerald-500"
                    : "bg-neutral-900 ring-neutral-800 hover:bg-neutral-800"
                }`}
              >
                <div>
                  <div className="font-semibold">{e.label}</div>
                  <div className="text-xs text-neutral-400">{e.blurb}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 6. Session length */}
      <Section number={6} title="Target session length?">
        <div className="grid grid-cols-5 gap-2">
          {SESSION_LENGTHS.map((m) => {
            const active = sessionLengthMin === m;
            return (
              <button
                key={m}
                onClick={() => setSessionLengthMin(m)}
                className={`rounded-xl py-3 text-sm font-semibold ring-1 transition ${
                  active
                    ? "bg-emerald-400 text-neutral-950 ring-emerald-400"
                    : "bg-neutral-900 text-neutral-300 ring-neutral-800 hover:bg-neutral-800"
                }`}
              >
                {m}m
              </button>
            );
          })}
        </div>
      </Section>

      {/* 7. Nutrition phase */}
      <Section
        number={7}
        title="What's your current phase?"
        hint="Drives the AI coach. You can change phases anytime as your plan shifts."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {PHASE_OPTIONS.map((p) => {
            const active = phase === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setPhase(p.value)}
                className={`flex items-start gap-3 rounded-xl p-3 text-left ring-1 transition ${
                  active
                    ? "bg-emerald-500/10 ring-emerald-500"
                    : "bg-neutral-900 ring-neutral-800 hover:bg-neutral-800"
                }`}
              >
                <span className="text-xl leading-tight">{p.icon}</span>
                <div>
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-xs text-neutral-400">{p.blurb}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 8. Body weight + target */}
      <Section
        number={8}
        title="Body weight & target"
        hint="Optional — but accuracy unlocks weight-trend coaching. You can update these anytime."
      >
        <div className="grid grid-cols-3 gap-2">
          <NumField
            label="Now (kg)"
            value={startingWeight}
            onChange={setStartingWeight}
            placeholder="75"
            step="0.1"
          />
          <NumField
            label="Target (kg)"
            value={targetWeight}
            onChange={setTargetWeight}
            placeholder={phase === "cut" ? "70" : phase === "bulk" ? "80" : "75"}
            step="0.1"
          />
          <NumField
            label="Height (cm)"
            value={heightCm}
            onChange={setHeightCm}
            placeholder="178"
            step="1"
          />
        </div>
      </Section>

      {/* 9. Avatar */}
      <Section
        number={9}
        title="Build your avatar"
        hint="It'll grow muscles as you stick to your training. You can edit it anytime."
      >
        <AvatarCustomizer look={avatar} level={2} onChange={setAvatar} compact />
      </Section>

      <div className="flex gap-2 pt-2">
        {onCancel && !isOnboarding && (
          <button onClick={onCancel} className="btn-ghost flex-1">
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex-1 py-4"
        >
          {isOnboarding ? "Save & continue" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <input
        type="number"
        inputMode="decimal"
        step={step ?? "1"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input text-base"
      />
    </label>
  );
}

function Section({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
          {number}
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {hint && <p className="-mt-1 text-xs text-neutral-500">{hint}</p>}
      {children}
    </section>
  );
}
