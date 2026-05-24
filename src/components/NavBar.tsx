import type { ScreenName } from "../types";

interface Props {
  current: ScreenName;
  onChange: (s: ScreenName) => void;
}

interface IconProps {
  className?: string;
}

function DumbbellIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 5v14" />
      <path d="M18 5v14" />
      <rect x="2" y="9" width="4" height="6" rx="1" />
      <rect x="18" y="9" width="4" height="6" rx="1" />
      <path d="M6 12h12" />
    </svg>
  );
}

function CalendarIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

function TrendIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

function ClipboardIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4h6v3H9z" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function NutritionIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a5 5 0 0 1 5 5v3a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7a5 5 0 0 1 5-5Z" />
      <path d="M8 11v5a4 4 0 0 0 8 0v-5" />
      <path d="M12 16v5" />
      <path d="M8 21h8" />
    </svg>
  );
}

const tabs: { id: ScreenName; label: string; Icon: (p: IconProps) => JSX.Element }[] = [
  { id: "today", label: "Today", Icon: DumbbellIcon },
  { id: "nutrition", label: "Nutrition", Icon: NutritionIcon },
  { id: "history", label: "History", Icon: CalendarIcon },
  { id: "progress", label: "Progress", Icon: TrendIcon },
  { id: "templates", label: "Templates", Icon: ClipboardIcon },
];

export function NavBar({ current, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 backdrop-blur-xl"
      style={{
        paddingBottom: "var(--safe-bottom)",
        background: "linear-gradient(180deg, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.98) 100%)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 -4px 24px -4px rgba(0,0,0,0.4)",
      }}
    >
      <div className="mx-auto flex max-w-xl">
        {tabs.map(({ id, label, Icon }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`relative flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition ${
                active ? "text-emerald-400" : "text-neutral-500 hover:text-neutral-300"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {/* Active indicator glow */}
              {active && (
                <span
                  className="pointer-events-none absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-emerald-400"
                  style={{ boxShadow: "0 0 12px 2px rgba(52,211,153,0.5)" }}
                />
              )}
              <Icon />
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
