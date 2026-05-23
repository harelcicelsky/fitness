export function Settings() {
  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      {/* Screen header */}
      <div className="relative">
        <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-36 rounded-full bg-neutral-500/5 blur-3xl" />
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-[11px] text-neutral-500">Customize your experience</p>
      </div>
      <div className="card space-y-2">
        <p className="text-neutral-300">Theme, units, RPE/RIR mode, and export/import will live here.</p>
        <p className="text-sm text-neutral-500">Units: kg (fixed for now). Theme: dark.</p>
      </div>
    </div>
  );
}
