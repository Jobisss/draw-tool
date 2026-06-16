import { select } from "./db";
import { todayDate } from "./logs";

/** Segunda-feira (00:00) da semana que contém `d`. weekday: 0=Seg..6=Dom. */
export function mondayOf(d: Date = new Date()): Date {
  const wd = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - wd);
}

/** Meta semanal somada dos planos ativos (dias/semana). */
export async function weeklyGoal(): Promise<number> {
  const r = await select<{ g: number | null }>(
    "SELECT SUM(weekly_goal_days) AS g FROM plan WHERE active = 1",
  );
  return r[0]?.g ?? 0;
}

async function loggedDates(): Promise<string[]> {
  const r = await select<{ date: string }>(
    "SELECT DISTINCT date FROM day_log WHERE done = 1 ORDER BY date",
  );
  return r.map((x) => x.date);
}

export type Consistency = {
  goal: number;
  daysThisWeek: number;
  streak: number;
};

/** Painel semana X/Y + streak de semanas consecutivas batendo a meta. */
export async function consistency(): Promise<Consistency> {
  // X = dias distintos com prática (máx 7); a meta somada é limitada a 7 dias/semana.
  const goal = Math.min(await weeklyGoal(), 7);
  const dates = await loggedDates();

  // dias distintos com log por semana (chave = segunda-feira da semana)
  const perWeek = new Map<string, number>();
  for (const ds of dates) {
    const [y, mo, da] = ds.split("-").map(Number);
    const key = todayDate(mondayOf(new Date(y, mo - 1, da)));
    perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
  }

  const daysThisWeek = perWeek.get(todayDate(mondayOf())) ?? 0;

  let streak = 0;
  if (goal > 0) {
    let w = mondayOf();
    let first = true;
    for (let i = 0; i < 260; i++) {
      const c = perWeek.get(todayDate(w)) ?? 0;
      if (c >= goal) {
        streak++;
      } else if (!first) {
        break; // semana passada não bateu → fim do streak
      }
      // semana atual (first) em andamento: não conta nem quebra
      first = false;
      w = new Date(w.getFullYear(), w.getMonth(), w.getDate() - 7);
    }
  }

  return { goal, daysThisWeek, streak };
}
