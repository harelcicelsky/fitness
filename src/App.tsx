import { useEffect, useState } from "react";
import type { ScreenName } from "./types";
import { NavBar } from "./components/NavBar";
import { Today } from "./screens/Today";
import { History } from "./screens/History";
import { Progress } from "./screens/Progress";
import { Templates } from "./screens/Templates";
import { Settings as SettingsScreen } from "./screens/Settings";
import { db, ensureInit } from "./db/schema";

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("today");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureInit();
      const profile = await db.profile.get("profile");
      if (cancelled) return;
      if (!profile || profile.completedAt === null) {
        setScreen("templates");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative flex h-full flex-col text-neutral-100"
      style={{ background: "#0a0a0a" }}
    >
      {/* ══════ GLOBAL BACKGROUND ══════ */}
      {/* Gym photo — sharp and visible, with a gradient overlay for readability */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(5,5,5,0.4) 0%, rgba(5,5,5,0.5) 30%, rgba(5,5,5,0.75) 60%, rgba(5,5,5,0.92) 85%, rgba(5,5,5,1) 100%)," +
            `url('${import.meta.env.BASE_URL}gym-bg.png')`,
          backgroundSize: "cover, cover",
          backgroundPosition: "center, center bottom",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* ══════ HEADER ══════ */}
      <header
        className="relative z-20 flex items-center justify-between px-4 py-3 backdrop-blur-xl"
        style={{
          paddingTop: "calc(0.75rem + var(--safe-top))",
          background: "linear-gradient(180deg, rgba(15,15,15,0.92) 0%, rgba(12,12,12,0.88) 100%)",
          borderBottom: "1px solid rgba(52,211,153,0.1)",
          boxShadow: "0 1px 20px -6px rgba(0,0,0,0.5)",
        }}
      >
        <h1 className="text-lg font-bold tracking-tight text-white">Workout Tracker</h1>
        <button
          aria-label="Settings"
          onClick={() => setScreen("settings")}
          className="rounded-xl p-2 transition hover:bg-white/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-400">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className="relative z-10 flex-1 overflow-y-auto pb-24">
        {screen === "today" && <Today />}
        {screen === "history" && <History />}
        {screen === "progress" && <Progress />}
        {screen === "templates" && <Templates />}
        {screen === "settings" && <SettingsScreen />}
      </main>

      <NavBar current={screen} onChange={setScreen} />
    </div>
  );
}
