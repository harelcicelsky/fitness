import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { formatDateTime, formatDuration } from "../lib/format";
import type {
  Block,
  CardioSession,
  Exercise,
  SetEntry,
  Workout,
} from "../types";

interface Props {
  workoutId: string;
  onClose: () => void;
}

interface Loaded {
  workout: Workout;
  blocks: Block[];
  sets: SetEntry[];
  cardios: CardioSession[];
  exMap: Map<string, Exercise>;
}

export function HistoryDetail({ workoutId, onClose }: Props) {
  const data = useLiveQuery(async (): Promise<Loaded | null> => {
    const workout = await db.workouts.get(workoutId);
    if (!workout) return null;
    const [blocks, sets, cardios, exercises] = await Promise.all([
      db.blocks.where("workoutId").equals(workoutId).toArray(),
      db.sets.where("workoutId").equals(workoutId).toArray(),
      db.cardioSessions.where("workoutId").equals(workoutId).toArray(),
      db.exercises.toArray(),
    ]);
    blocks.sort((a, b) => a.order - b.order);
    return {
      workout,
      blocks,
      sets,
      cardios,
      exMap: new Map(exercises.map((e) => [e.id, e])),
    };
  }, [workoutId]);

  if (!data) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <button onClick={onClose} className="btn-ghost py-2 text-sm">
          ← Back
        </button>
        <div className="card text-neutral-400">Workout not found.</div>
      </div>
    );
  }

  const { workout, blocks, sets, cardios, exMap } = data;
  const inProgress = workout.endedAt === null;
  const durationSec =
    workout.endedAt !== null
      ? Math.round((workout.endedAt - workout.startedAt) / 1000)
      : null;
  const totalVolume = sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="btn-ghost py-2 text-sm">
          ← Back
        </button>
        {inProgress ? (
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
            In progress
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
            Completed
          </span>
        )}
      </div>

      <div className="card space-y-1">
        <div className="text-xs uppercase tracking-wider text-neutral-500">
          {inProgress ? "Started" : "Workout"}
        </div>
        <div className="text-lg font-semibold">
          {formatDateTime(workout.startedAt)}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-neutral-400">
          <span>
            <span className="text-neutral-200">{sets.length}</span> sets
          </span>
          {cardios.length > 0 && (
            <span>
              <span className="text-neutral-200">{cardios.length}</span> cardio
            </span>
          )}
          <span>
            <span className="text-neutral-200">
              {Math.round(totalVolume).toLocaleString()}
            </span>{" "}
            kg total volume
          </span>
          {durationSec !== null && (
            <span>
              <span className="text-neutral-200">
                {formatDuration(durationSec)}
              </span>{" "}
              duration
            </span>
          )}
        </div>
      </div>

      {blocks.map((b) => {
        const blockExercises = b.exerciseIds
          .map((id) => exMap.get(id))
          .filter((e): e is Exercise => !!e);
        const blockSets = sets
          .filter((s) => s.blockId === b.id)
          .sort((a, b) => a.completedAt - b.completedAt);
        const blockCardios = cardios.filter((c) => c.blockId === b.id);
        const ended = b.endedAt !== null;

        return (
          <div
            key={b.id}
            className={`card space-y-3 ${ended ? "ring-emerald-500/30" : ""}`}
          >
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] uppercase tracking-wider text-emerald-400/80">
                {b.type === "single" &&
                  (blockExercises[0]?.isCardio ? "Cardio" : "Exercise")}
                {b.type === "superset" && "Superset"}
                {b.type === "circuit" && "Circuit"}
              </span>
              {ended && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  ✓ Done
                </span>
              )}
            </div>

            {blockExercises.map((e) => {
              if (e.isCardio) {
                const c = blockCardios.find((x) => x.exerciseId === e.id);
                return (
                  <div key={e.id} className="space-y-1">
                    <div className="font-semibold">{e.name}</div>
                    {c ? (
                      <div className="text-sm text-neutral-300">
                        {formatDuration(c.durationSec)}
                        {c.distanceM != null &&
                          ` · ${(c.distanceM / 1000).toFixed(2)} km`}
                        {c.avgHr != null && ` · ♥ avg ${c.avgHr}`}
                        {c.maxHr != null && ` · ♥ max ${c.maxHr}`}
                      </div>
                    ) : (
                      <div className="text-sm text-neutral-500">No data logged.</div>
                    )}
                  </div>
                );
              }

              const exSets = blockSets.filter((s) => s.exerciseId === e.id);
              const parents = exSets.filter((s) => !s.parentSetId);
              const childrenOf = (id: string) =>
                exSets.filter((s) => s.parentSetId === id);

              return (
                <div key={e.id} className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-neutral-500">
                      {parents.length} set{parents.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  {parents.length === 0 && (
                    <div className="text-sm text-neutral-500">No sets logged.</div>
                  )}
                  <ul className="space-y-1">
                    {parents.map((s, i) => {
                      const drops = childrenOf(s.id);
                      const rpeLabel =
                        s.rpe !== null
                          ? `RPE ${s.rpe}`
                          : s.rir !== null
                            ? `RIR ${s.rir}`
                            : null;
                      return (
                        <li key={s.id} className="rounded-lg bg-neutral-800/40 p-2">
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
                              {i + 1}
                            </span>
                            <span className="font-medium">
                              {s.weightKg} kg × {s.reps}
                            </span>
                            {rpeLabel && (
                              <span className="text-xs text-neutral-500">
                                {rpeLabel}
                              </span>
                            )}
                          </div>
                          {drops.length > 0 && (
                            <div className="mt-1 space-y-0.5 border-l-2 border-emerald-500/30 pl-3">
                              {drops.map((d, di) => (
                                <div
                                  key={d.id}
                                  className="flex items-center gap-2 text-sm text-neutral-400"
                                >
                                  <span className="text-xs text-emerald-400/70">
                                    drop {di + 1}
                                  </span>
                                  <span>
                                    {d.weightKg} kg × {d.reps}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      })}

      {blocks.length === 0 && (
        <div className="card text-sm text-neutral-400">
          No exercises in this workout.
        </div>
      )}
    </div>
  );
}
