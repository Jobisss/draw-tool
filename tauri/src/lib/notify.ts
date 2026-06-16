import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { getSetting } from "./settings";
import { todayDate } from "./logs";

export const NOTIFY_ENABLED = "notify_enabled";
export const NOTIFY_TIME = "notify_time"; // HH:MM

let lastFired = "";
let started = false;

export async function ensurePermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) granted = (await requestPermission()) === "granted";
  return granted;
}

export async function sendReminder(body = "Hora de praticar desenho 🎨") {
  if (await ensurePermission()) {
    sendNotification({ title: "draw-study", body });
  }
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

/** Loop (enquanto o app está aberto): dispara o lembrete no horário configurado, 1x/dia. */
export function startReminderLoop() {
  if (started) return;
  started = true;
  setInterval(async () => {
    if ((await getSetting(NOTIFY_ENABLED)) !== "1") return;
    const time = await getSetting(NOTIFY_TIME);
    if (!time) return;
    const today = todayDate();
    if (hhmm(new Date()) === time && lastFired !== today) {
      lastFired = today;
      await sendReminder();
    }
  }, 30_000);
}
