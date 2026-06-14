import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/schema";
import {
  isNotificationSupported,
  hasPermission,
  requestPermission,
  startReminderScheduler,
  stopReminderScheduler,
} from "../lib/notifications";

export function Settings() {
  const settings = useLiveQuery(() => db.settings.get("settings"), []);
  const [permError, setPermError] = useState<string | null>(null);

  const fridayEnabled = settings?.fridayReminder ?? false;

  const handleToggleReminder = async () => {
    if (!isNotificationSupported()) {
      setPermError("Notifications are not supported in this browser.");
      return;
    }

    const newValue = !fridayEnabled;

    if (newValue) {
      const granted = await requestPermission();
      if (!granted) {
        setPermError("Notification permission denied. Enable it in your browser settings.");
        return;
      }
      setPermError(null);
      startReminderScheduler();
    } else {
      stopReminderScheduler();
    }

    await db.settings.update("settings", { fridayReminder: newValue });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4 pb-28">
      {/* Screen header */}
      <div className="relative">
        <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-36 rounded-full bg-neutral-500/5 blur-3xl" />
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-[11px] text-neutral-500">Customize your experience</p>
      </div>

      {/* Notifications */}
      <div className="card space-y-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-400">
          Notifications
        </div>

        <button
          onClick={handleToggleReminder}
          className="flex w-full items-center justify-between py-1"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-white">Friday weigh-in reminder</div>
            <div className="mt-0.5 text-[11px] text-neutral-500">
              Every Friday at 10:00 AM
            </div>
          </div>
          <div
            className={`relative h-6 w-11 rounded-full transition-colors ${
              fridayEnabled ? "bg-emerald-500" : "bg-neutral-700"
            }`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                fridayEnabled ? "translate-x-[22px]" : "translate-x-0.5"
              }`}
            />
          </div>
        </button>

        {fridayEnabled && hasPermission() && (
          <p className="text-[11px] text-emerald-400/70">
            You'll get a reminder to log your weight every Friday at 10 AM
          </p>
        )}

        {permError && (
          <p className="text-[11px] text-red-400">{permError}</p>
        )}
      </div>

      {/* General */}
      <div className="card space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-500">
          General
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-neutral-300">Units</span>
          <span className="text-sm text-neutral-500">kg</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-neutral-300">Theme</span>
          <span className="text-sm text-neutral-500">Dark</span>
        </div>
      </div>
    </div>
  );
}
