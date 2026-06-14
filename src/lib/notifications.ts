const LAST_REMINDER_KEY = "friday-reminder-last";

export function isNotificationSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

export async function requestPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function hasPermission(): boolean {
  return isNotificationSupported() && Notification.permission === "granted";
}

function isoWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
}

function alreadySentThisWeek(): boolean {
  try {
    const last = localStorage.getItem(LAST_REMINDER_KEY);
    return last === isoWeekKey(new Date());
  } catch {
    return false;
  }
}

function markSent() {
  try {
    localStorage.setItem(LAST_REMINDER_KEY, isoWeekKey(new Date()));
  } catch { /* ignore */ }
}

async function showReminder() {
  if (alreadySentThisWeek()) return;
  markSent();

  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Workout Tracker", {
      body: "Time to log your weight! Step on the scale and track your progress.",
      icon: "/fitness/icons/icon.svg",
      badge: "/fitness/icons/icon.svg",
      tag: "friday-weigh-in",
    } as NotificationOptions);
  } catch {
    new Notification("Workout Tracker", {
      body: "Time to log your weight! Step on the scale and track your progress.",
      icon: "/fitness/icons/icon.svg",
    });
  }
}

function shouldFireNow(): boolean {
  const now = new Date();
  return now.getDay() === 5 && now.getHours() >= 10 && !alreadySentThisWeek();
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler() {
  stopReminderScheduler();

  if (!hasPermission()) return;

  // Check immediately
  if (shouldFireNow()) showReminder();

  // Check every 15 minutes
  intervalId = setInterval(() => {
    if (shouldFireNow()) showReminder();
  }, 15 * 60 * 1000);
}

export function stopReminderScheduler() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
