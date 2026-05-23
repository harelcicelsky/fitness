interface Props {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  ariaLabel?: string;
  className?: string;
  decimals?: number;
}

export function NumberStepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  ariaLabel,
  className = "",
  decimals = 0,
}: Props) {
  const clamp = (n: number) => {
    if (min !== undefined && n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  };
  const fmt = (n: number) =>
    decimals > 0 ? Number(n.toFixed(decimals)).toString() : Math.round(n).toString();

  return (
    <div className={`flex items-stretch overflow-hidden rounded-xl ring-1 ring-neutral-700 bg-neutral-800 ${className}`}>
      <button
        type="button"
        aria-label={`Decrease ${ariaLabel ?? "value"}`}
        onClick={() => onChange(clamp(value - step))}
        className="w-10 text-lg font-semibold text-neutral-300 hover:bg-neutral-700 active:bg-neutral-600"
      >
        −
      </button>
      <input
        aria-label={ariaLabel}
        inputMode="decimal"
        type="text"
        value={fmt(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(",", ".");
          if (raw === "" || raw === "-") {
            onChange(0);
            return;
          }
          const n = parseFloat(raw);
          if (!Number.isNaN(n)) onChange(clamp(n));
        }}
        className="w-full bg-transparent px-2 text-center text-lg font-medium text-neutral-100 focus:outline-none"
      />
      <button
        type="button"
        aria-label={`Increase ${ariaLabel ?? "value"}`}
        onClick={() => onChange(clamp(value + step))}
        className="w-10 text-lg font-semibold text-neutral-300 hover:bg-neutral-700 active:bg-neutral-600"
      >
        +
      </button>
    </div>
  );
}
