import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import type { Exercise } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (exerciseIds: string[]) => void;
  multi?: boolean;       // for supersets
  filter?: "strength" | "cardio" | "all";
  title?: string;
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
  multi = false,
  filter = "all",
  title = "Pick exercise",
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const all = useLiveQuery(() => db.exercises.toArray(), []);

  const exercises = useMemo(() => {
    if (!all) return [];
    let list: Exercise[] = all.filter((e) => !e.archived);
    if (filter === "strength") list = list.filter((e) => !e.isCardio);
    if (filter === "cardio") list = list.filter((e) => e.isCardio);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.primaryMuscles.some((m) => m.toLowerCase().includes(q)) ||
          e.equipment.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [all, query, filter]);

  if (!open) return null;

  const toggle = (id: string) => {
    if (multi) {
      setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    } else {
      onPick([id]);
      onClose();
      setQuery("");
    }
  };

  const confirmMulti = () => {
    if (selected.length === 0) return;
    onPick(selected);
    onClose();
    setSelected([]);
    setQuery("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950/95 backdrop-blur"
      style={{ paddingTop: "var(--safe-top)", paddingBottom: "var(--safe-bottom)" }}
    >
      <div className="flex items-center gap-2 border-b border-neutral-800 p-3">
        <button onClick={onClose} className="btn-ghost px-3 py-2 text-sm">
          Cancel
        </button>
        <h3 className="flex-1 text-center font-medium">{title}</h3>
        {multi ? (
          <button
            onClick={confirmMulti}
            disabled={selected.length === 0}
            className="btn-primary px-3 py-2 text-sm"
          >
            Add {selected.length || ""}
          </button>
        ) : (
          <span className="w-16" />
        )}
      </div>
      <div className="p-3">
        <input
          autoFocus
          placeholder="Search exercises…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-6">
        {exercises.length === 0 && (
          <p className="p-6 text-center text-neutral-500">No matches.</p>
        )}
        <ul className="space-y-1">
          {exercises.map((e) => {
            const isSelected = selected.includes(e.id);
            return (
              <li key={e.id}>
                <button
                  onClick={() => toggle(e.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left ring-1 transition ${
                    isSelected
                      ? "bg-emerald-500/10 ring-emerald-500"
                      : "bg-neutral-900 ring-neutral-800 hover:bg-neutral-800"
                  }`}
                >
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-neutral-500">
                      {e.primaryMuscles.join(" · ")} · {e.equipment}
                    </div>
                  </div>
                  {multi && (
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full ring-1 ${
                        isSelected ? "bg-emerald-500 ring-emerald-500 text-neutral-950" : "ring-neutral-700"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
