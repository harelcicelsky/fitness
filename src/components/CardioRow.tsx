import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import { addCardio, deleteCardio, updateCardio } from "../db/queries";
import { NumberStepper } from "./NumberStepper";

interface Props {
  workoutId: string;
  blockId: string;
  exerciseId: string;
  exerciseName: string;
}

export function CardioRow({ workoutId, blockId, exerciseId, exerciseName }: Props) {
  const sessions = useLiveQuery(
    () => db.cardioSessions.where("blockId").equals(blockId).toArray(),
    [blockId],
  );
  const existing = sessions?.[0];

  const [minutes, setMinutes] = useState<number>(20);
  const [seconds, setSeconds] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [avgHr, setAvgHr] = useState<number>(0);
  const [maxHr, setMaxHr] = useState<number>(0);

  const save = async () => {
    const durationSec = minutes * 60 + seconds;
    const distanceM = distanceKm > 0 ? Math.round(distanceKm * 1000) : null;
    if (existing) {
      await updateCardio(existing.id, {
        durationSec,
        distanceM,
        avgHr: avgHr || null,
        maxHr: maxHr || null,
      });
    } else {
      await addCardio({
        workoutId,
        blockId,
        exerciseId,
        durationSec,
        distanceM,
        avgHr: avgHr || null,
        maxHr: maxHr || null,
        calories: null,
        notes: "",
      });
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-neutral-200">{exerciseName}</h4>
        {existing && (
          <span className="text-xs text-neutral-500">
            {formatDuration(existing.durationSec)}
            {existing.distanceM ? ` · ${(existing.distanceM / 1000).toFixed(2)} km` : ""}
            {existing.avgHr ? ` · ♥ ${existing.avgHr}` : ""}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-neutral-500">Min</label>
          <NumberStepper value={minutes} onChange={setMinutes} step={1} min={0} ariaLabel="minutes" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-neutral-500">Sec</label>
          <NumberStepper value={seconds} onChange={setSeconds} step={5} min={0} max={59} ariaLabel="seconds" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-neutral-500">Distance (km)</label>
          <NumberStepper value={distanceKm} onChange={setDistanceKm} step={0.1} decimals={2} min={0} ariaLabel="distance km" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-neutral-500">Avg HR</label>
          <NumberStepper value={avgHr} onChange={setAvgHr} step={1} min={0} max={250} ariaLabel="average heart rate" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-neutral-500">Max HR</label>
          <NumberStepper value={maxHr} onChange={setMaxHr} step={1} min={0} max={250} ariaLabel="max heart rate" />
        </div>
        <div className="flex items-end">
          <button onClick={save} className="btn-primary w-full">
            {existing ? "Update" : "Save"}
          </button>
        </div>
      </div>

      {existing && (
        <button
          onClick={() => deleteCardio(existing.id)}
          className="text-xs text-red-400 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
