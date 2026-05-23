/**
 * Compact visual showing what plates to load on each side of a 20kg barbell to
 * reach a target weight. Hidden if the weight isn't divisible into standard
 * plates (e.g. dumbbell/machine work).
 */

const BAR_WEIGHT = 20;
const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
// Tailwind colors per plate (rough IPF style — red 25, blue 20, yellow 15, green 10, white 5, black 2.5, silver 1.25)
const PLATE_COLOR: Record<number, string> = {
  25: "#dc2626", // red-600
  20: "#2563eb", // blue-600
  15: "#facc15", // yellow-400
  10: "#16a34a", // green-600
  5: "#f5f5f5",  // neutral-100
  2.5: "#404040", // neutral-700
  1.25: "#a3a3a3", // neutral-400
};
const PLATE_TEXT: Record<number, string> = {
  25: "#fff",
  20: "#fff",
  15: "#1a1a1a",
  10: "#fff",
  5: "#1a1a1a",
  2.5: "#fff",
  1.25: "#1a1a1a",
};

export function PlateCalculator({ weightKg }: { weightKg: number }) {
  if (weightKg <= BAR_WEIGHT) return null;
  const perSide = (weightKg - BAR_WEIGHT) / 2;

  // Greedy plate decomposition. If we can't get within 0.05kg, bail out.
  const plates: number[] = [];
  let remaining = perSide;
  for (const p of PLATE_SIZES) {
    while (remaining >= p - 0.001) {
      plates.push(p);
      remaining -= p;
    }
  }
  if (Math.abs(remaining) > 0.05) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-md bg-neutral-950/60 px-2 py-1 ring-1 ring-neutral-800">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
        Plates/side
      </span>
      <div className="flex items-center gap-0.5">
        {plates.map((p, i) => (
          <span
            key={i}
            className="inline-flex h-4 items-center justify-center rounded-sm px-1 text-[9px] font-bold tabular-nums"
            style={{
              background: PLATE_COLOR[p],
              color: PLATE_TEXT[p],
              minWidth: 18,
            }}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}
