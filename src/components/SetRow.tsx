import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { addSet, deleteSet, updateSet } from "../db/queries";
import { NumberStepper } from "./NumberStepper";
import { PlateCalculator } from "./PlateCalculator";
import type { SetEntry } from "../types";

interface ExerciseSetsProps {
  workoutId: string;
  blockId: string;
  exerciseId: string;
  exerciseName: string;
  rpeMode: "rpe" | "rir" | "off";
  locked?: boolean;
}

export function ExerciseSets({
  workoutId,
  blockId,
  exerciseId,
  exerciseName,
  rpeMode,
  locked = false,
}: ExerciseSetsProps) {
  const sets = useLiveQuery(
    async () => {
      const all = await db.sets.where("blockId").equals(blockId).toArray();
      return all
        .filter((s) => s.exerciseId === exerciseId)
        .sort((a, b) => a.completedAt - b.completedAt);
    },
    [blockId, exerciseId],
  );

  const parents = (sets ?? []).filter((s) => !s.parentSetId);
  const childrenOf = (id: string) => (sets ?? []).filter((s) => s.parentSetId === id);

  const lastParent = parents[parents.length - 1];
  const [draftWeight, setDraftWeight] = useState<number>(lastParent?.weightKg ?? 20);
  const [draftReps, setDraftReps] = useState<number>(lastParent?.reps ?? 8);

  const addParent = async () => {
    const order = parents.length;
    await addSet({
      workoutId,
      blockId,
      exerciseId,
      order,
      weightKg: draftWeight,
      reps: draftReps,
      rpe: null,
      rir: null,
      isWarmup: false,
      parentSetId: null,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-neutral-200">{exerciseName}</h4>
        <span className="text-xs text-neutral-500">{parents.length} set{parents.length === 1 ? "" : "s"}</span>
      </div>

      {parents.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          index={i + 1}
          children={childrenOf(s.id)}
          rpeMode={rpeMode}
          locked={locked}
        />
      ))}

      {!locked && (
        <div className="rounded-xl bg-neutral-800/60 p-3 ring-1 ring-neutral-800">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-neutral-500">
            <span className="flex-1">Weight (kg)</span>
            <span className="flex-1 text-center">Reps</span>
            <span className="w-20 text-right">Action</span>
          </div>
          <div className="flex items-center gap-2">
            <NumberStepper
              value={draftWeight}
              onChange={setDraftWeight}
              step={2.5}
              decimals={2}
              min={0}
              ariaLabel="weight"
              className="flex-1"
            />
            <NumberStepper
              value={draftReps}
              onChange={setDraftReps}
              step={1}
              min={0}
              ariaLabel="reps"
              className="flex-1"
            />
            <button onClick={addParent} className="btn-primary w-20 py-3 text-sm">
              ✓ Set
            </button>
          </div>
          {/* Plate calculator — shows what plates to load on each side */}
          <div className="mt-2 flex justify-end">
            <PlateCalculator weightKg={draftWeight} />
          </div>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  set: SetEntry;
  index: number;
  children: SetEntry[];
  rpeMode: "rpe" | "rir" | "off";
  locked: boolean;
}

function SetRow({ set, index, children, rpeMode, locked }: RowProps) {
  const [showDrop, setShowDrop] = useState(false);
  const [dropWeight, setDropWeight] = useState<number>(Math.max(0, set.weightKg - 5));
  const [dropReps, setDropReps] = useState<number>(set.reps);

  const onWeight = (w: number) => updateSet(set.id, { weightKg: w });
  const onReps = (r: number) => updateSet(set.id, { reps: r });
  const onRpe = (v: number | null) =>
    rpeMode === "rir" ? updateSet(set.id, { rir: v }) : updateSet(set.id, { rpe: v });

  const rpeValue = rpeMode === "rir" ? set.rir : set.rpe;

  if (locked) {
    return (
      <div className="rounded-xl bg-neutral-900/60 p-3 ring-1 ring-neutral-800/60">
        <div className="flex items-center gap-3 text-sm">
          <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
            {index}
          </span>
          <span className="font-medium text-neutral-200">
            {set.weightKg} kg × {set.reps}
          </span>
          {rpeValue !== null && rpeMode !== "off" && (
            <span className="text-xs text-neutral-500">
              {rpeMode.toUpperCase()} {rpeValue}
            </span>
          )}
        </div>
        {children.length > 0 && (
          <div className="mt-2 space-y-1 border-l-2 border-emerald-500/30 pl-3 text-sm text-neutral-400">
            {children.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-xs text-emerald-400/70">drop {i + 1}</span>
                <span>
                  {c.weightKg} kg × {c.reps}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const addDrop = async () => {
    const order = children.length;
    await addSet({
      workoutId: set.workoutId,
      blockId: set.blockId,
      exerciseId: set.exerciseId,
      order,
      weightKg: dropWeight,
      reps: dropReps,
      rpe: null,
      rir: null,
      isWarmup: false,
      parentSetId: set.id,
    });
    setShowDrop(false);
  };

  return (
    <div className="rounded-xl bg-neutral-900 p-3 ring-1 ring-neutral-800">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
          {index}
        </span>
        <NumberStepper
          value={set.weightKg}
          onChange={onWeight}
          step={2.5}
          decimals={2}
          min={0}
          ariaLabel="weight"
          className="flex-1"
        />
        <NumberStepper
          value={set.reps}
          onChange={onReps}
          step={1}
          min={0}
          ariaLabel="reps"
          className="flex-1"
        />
        <button
          onClick={() => deleteSet(set.id)}
          aria-label="Delete set"
          className="w-10 rounded-xl bg-neutral-800 py-3 text-neutral-400 hover:bg-red-500/20 hover:text-red-400"
        >
          ✕
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs">
        {rpeMode !== "off" && (
          <RpeRirSelector
            mode={rpeMode}
            value={rpeValue}
            onChange={onRpe}
          />
        )}
        <button
          onClick={() => setShowDrop((s) => !s)}
          className="ml-auto rounded-md px-2 py-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
        >
          {showDrop ? "Cancel drop" : "+ Drop"}
        </button>
      </div>

      {showDrop && (
        <div className="mt-2 space-y-2 rounded-lg bg-neutral-800/60 p-2">
          <div className="flex items-center gap-2">
            <NumberStepper
              value={dropWeight}
              onChange={setDropWeight}
              step={2.5}
              decimals={2}
              min={0}
              ariaLabel="drop weight"
              className="flex-1"
            />
            <NumberStepper
              value={dropReps}
              onChange={setDropReps}
              step={1}
              min={0}
              ariaLabel="drop reps"
              className="flex-1"
            />
            <button onClick={addDrop} className="btn-primary w-20 py-2 text-sm">
              Drop
            </button>
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-2 space-y-1 border-l-2 border-emerald-500/40 pl-3">
          {children.map((c, i) => (
            <DropChild key={c.id} set={c} index={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function DropChild({ set, index }: { set: SetEntry; index: number }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-emerald-400/80">drop {index}</span>
      <NumberStepper
        value={set.weightKg}
        onChange={(w) => updateSet(set.id, { weightKg: w })}
        step={2.5}
        decimals={2}
        min={0}
        ariaLabel="drop weight"
        className="flex-1"
      />
      <NumberStepper
        value={set.reps}
        onChange={(r) => updateSet(set.id, { reps: r })}
        step={1}
        min={0}
        ariaLabel="drop reps"
        className="flex-1"
      />
      <button
        onClick={() => deleteSet(set.id)}
        aria-label="Delete drop"
        className="w-9 rounded-lg bg-neutral-800 py-2 text-xs text-neutral-400 hover:bg-red-500/20 hover:text-red-400"
      >
        ✕
      </button>
    </div>
  );
}

function RpeRirSelector({
  mode,
  value,
  onChange,
}: {
  mode: "rpe" | "rir";
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const options =
    mode === "rpe"
      ? [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]
      : [0, 1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      <span className="text-neutral-500">{mode.toUpperCase()}</span>
      <button
        onClick={() => onChange(null)}
        className={`rounded-md px-2 py-1 text-xs ${
          value === null ? "bg-neutral-700 text-neutral-300" : "text-neutral-500"
        }`}
      >
        —
      </button>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-md px-2 py-1 text-xs ${
            value === o ? "bg-emerald-500 text-neutral-950 font-semibold" : "text-neutral-400 hover:bg-neutral-800"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
