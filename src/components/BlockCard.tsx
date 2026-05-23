import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { deleteBlock, endBlock, reopenBlock } from "../db/queries";
import { ExerciseSets } from "./SetRow";
import { CardioRow } from "./CardioRow";
import type { Block } from "../types";

interface Props {
  block: Block;
  rpeMode: "rpe" | "rir" | "off";
}

export function BlockCard({ block, rpeMode }: Props) {
  const exercises = useLiveQuery(
    async () => {
      if (block.exerciseIds.length === 0) return [];
      const list = await db.exercises.bulkGet(block.exerciseIds);
      return list.filter((x): x is NonNullable<typeof x> => !!x);
    },
    [block.exerciseIds.join(",")],
  );

  const setCount = useLiveQuery(
    () => db.sets.where("blockId").equals(block.id).count(),
    [block.id],
  );

  if (!exercises) return null;

  const isCardio = exercises.every((e) => e.isCardio);
  const ended = block.endedAt !== null;
  const hasAnyEntry = (setCount ?? 0) > 0;

  return (
    <div className={`card space-y-4 ${ended ? "ring-emerald-500/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-400/80">
            <span>
              {block.type === "single" && (isCardio ? "Cardio" : "Exercise")}
              {block.type === "superset" && "Superset"}
              {block.type === "circuit" && "Circuit"}
            </span>
            {ended && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                ✓ Done
              </span>
            )}
          </div>
          <div className="text-sm text-neutral-400">
            {exercises.map((e) => e.name).join(" + ")}
          </div>
        </div>
        <button
          onClick={() => {
            if (confirm("Remove this block and all its sets?")) deleteBlock(block.id);
          }}
          aria-label="Delete block"
          className="rounded-lg p-2 text-neutral-500 hover:bg-red-500/10 hover:text-red-400"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        {exercises.map((e) =>
          e.isCardio ? (
            <CardioRow
              key={e.id}
              workoutId={block.workoutId}
              blockId={block.id}
              exerciseId={e.id}
              exerciseName={e.name}
            />
          ) : (
            <ExerciseSets
              key={e.id}
              workoutId={block.workoutId}
              blockId={block.id}
              exerciseId={e.id}
              exerciseName={e.name}
              rpeMode={rpeMode}
              locked={ended}
            />
          ),
        )}
      </div>

      {!isCardio && (
        <div className="flex justify-end pt-1">
          {ended ? (
            <button
              onClick={() => reopenBlock(block.id)}
              className="btn-ghost py-2 text-xs"
            >
              Reopen exercise
            </button>
          ) : (
            <button
              onClick={() => endBlock(block.id)}
              disabled={!hasAnyEntry}
              className="btn-primary py-2 text-sm disabled:opacity-40"
              title={hasAnyEntry ? "" : "Log at least one set first"}
            >
              ✓ End exercise
            </button>
          )}
        </div>
      )}
    </div>
  );
}
