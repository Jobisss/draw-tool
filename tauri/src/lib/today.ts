import { select } from "./db";
import type { PlanSlot } from "./plans";

export type TodayItem = PlanSlot & { plan_name: string };

/** Dia-da-semana no padrão do schema: 0=Seg .. 6=Dom (JS getDay: 0=Dom). */
export function currentWeekday(d: Date = new Date()): number {
  return (d.getDay() + 6) % 7;
}

/** Slots dos planos ATIVOS p/ o dia-da-semana atual. */
export async function todayPractices(
  weekday: number = currentWeekday(),
): Promise<TodayItem[]> {
  return select<TodayItem>(
    `SELECT ps.*, p.name AS plan_name
       FROM plan_slot ps
       JOIN plan p ON p.id = ps.plan_id
      WHERE p.active = 1 AND ps.weekday = $1
      ORDER BY p.name, ps.id`,
    [weekday],
  );
}
