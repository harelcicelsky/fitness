import { Avatar } from "./Avatar";
import type { AvatarLook, Build, HairStyle, SkinTone } from "../types";

interface Props {
  look: AvatarLook;
  level: number;
  onChange: (look: AvatarLook) => void;
  compact?: boolean;
}

const SKIN_TONES: { value: SkinTone; swatch: string }[] = [
  { value: "tone1", swatch: "#f5d6b8" },
  { value: "tone2", swatch: "#e8b88f" },
  { value: "tone3", swatch: "#c98a5b" },
  { value: "tone4", swatch: "#8e5a36" },
  { value: "tone5", swatch: "#5a3621" },
];

const HAIR_STYLES: { value: HairStyle; label: string }[] = [
  { value: "bald", label: "Bald" },
  { value: "buzzed", label: "Buzzed" },
  { value: "short", label: "Short" },
  { value: "long", label: "Long" },
  { value: "ponytail", label: "Ponytail" },
  { value: "bun", label: "Bun" },
  { value: "curly", label: "Curly" },
  { value: "mohawk", label: "Mohawk" },
];

const HAIR_COLORS = ["#1a1a1a", "#3a2d20", "#7a4a2e", "#c9a36a", "#e0c094", "#b03a2e", "#cccccc"];
const OUTFIT_COLORS = ["#1f2937", "#0f172a", "#7f1d1d", "#1e3a8a", "#14532d", "#854d0e", "#7c2d12", "#312e81"];

export function AvatarCustomizer({ look, level, onChange, compact = false }: Props) {
  const set = <K extends keyof AvatarLook>(k: K, v: AvatarLook[K]) =>
    onChange({ ...look, [k]: v });

  return (
    <div className={`grid gap-4 ${compact ? "" : "sm:grid-cols-[auto_1fr]"}`}>
      <div className="flex justify-center">
        <div className="rounded-2xl bg-gradient-to-b from-neutral-800 to-neutral-900 p-3 ring-1 ring-neutral-700">
          <Avatar look={look} level={level} size={compact ? 200 : 240} />
        </div>
      </div>

      <div className="space-y-4">
        <Field label="Body">
          <div className="grid grid-cols-2 gap-2">
            {(["masc", "fem"] as Build[]).map((b) => (
              <button
                key={b}
                onClick={() => set("build", b)}
                className={`rounded-xl py-2 text-sm font-medium ring-1 transition ${
                  look.build === b
                    ? "bg-emerald-400 text-neutral-950 ring-emerald-400"
                    : "bg-neutral-900 text-neutral-300 ring-neutral-800 hover:bg-neutral-800"
                }`}
              >
                {b === "masc" ? "Boy" : "Girl"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Skin tone">
          <div className="flex gap-2">
            {SKIN_TONES.map((s) => (
              <button
                key={s.value}
                aria-label={`Skin ${s.value}`}
                onClick={() => set("skinTone", s.value)}
                style={{ background: s.swatch }}
                className={`h-10 w-10 rounded-full ring-2 transition ${
                  look.skinTone === s.value ? "ring-emerald-400 scale-110" : "ring-neutral-700"
                }`}
              />
            ))}
          </div>
        </Field>

        <Field label="Hair style">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {HAIR_STYLES.map((h) => (
              <button
                key={h.value}
                onClick={() => set("hairStyle", h.value)}
                className={`rounded-xl py-2 text-xs font-medium ring-1 transition ${
                  look.hairStyle === h.value
                    ? "bg-emerald-400 text-neutral-950 ring-emerald-400"
                    : "bg-neutral-900 text-neutral-300 ring-neutral-800 hover:bg-neutral-800"
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </Field>

        {look.hairStyle !== "bald" && (
          <Field label="Hair color">
            <div className="flex flex-wrap gap-2">
              {HAIR_COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Hair ${c}`}
                  onClick={() => set("hairColor", c)}
                  style={{ background: c }}
                  className={`h-8 w-8 rounded-full ring-2 transition ${
                    look.hairColor === c ? "ring-emerald-400 scale-110" : "ring-neutral-700"
                  }`}
                />
              ))}
            </div>
          </Field>
        )}

        <Field label="Shorts">
          <div className="flex flex-wrap gap-2">
            {OUTFIT_COLORS.map((c) => (
              <button
                key={c}
                aria-label={`Shorts ${c}`}
                onClick={() => set("outfitColor", c)}
                style={{ background: c }}
                className={`h-8 w-8 rounded-md ring-2 transition ${
                  look.outfitColor === c ? "ring-emerald-400 scale-110" : "ring-neutral-700"
                }`}
              />
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      {children}
    </div>
  );
}
