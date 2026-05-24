/**
 * MacroRing — animated circular progress ring for displaying macro nutrients.
 * Renders an SVG donut chart with a smooth fill animation.
 */

interface Props {
  /** Current value */
  value: number;
  /** Maximum / target value */
  max: number;
  /** Display label (e.g. "Protein") */
  label: string;
  /** Unit suffix (default "g") */
  unit?: string;
  /** Ring color (Tailwind-compatible hex or CSS color) */
  color: string;
  /** Ring track color */
  trackColor?: string;
  /** Diameter in px */
  size?: number;
}

export function MacroRing({
  value,
  max,
  label,
  unit = "g",
  color,
  trackColor = "rgba(255,255,255,0.06)",
  size = 100,
}: Props) {
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / Math.max(max, 1), 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold tabular-nums text-white">
            {Math.round(value)}
          </span>
          <span className="text-[9px] font-medium text-neutral-500">{unit}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </span>
    </div>
  );
}
