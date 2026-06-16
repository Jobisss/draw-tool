import { select, execute } from "./db";

export type DayLog = {
  id: number;
  plan_id: number | null;
  slot_id: number | null;
  date: string; // YYYY-MM-DD
  done: number;
  study_id: number | null;
  quick_note: string | null;
  duration_min: number | null;
  created_at: string;
};

/** Data local de hoje no formato YYYY-MM-DD (sem timezone shift do toISOString). */
export function todayDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export async function logsForDate(date: string): Promise<DayLog[]> {
  return select<DayLog>("SELECT * FROM day_log WHERE date = $1", [date]);
}

/** Marca uma prática (slot) como feita no dia. */
export async function logDone(
  planId: number | null,
  slotId: number | null,
  date: string,
  quickNote: string | null,
  durationMin: number | null,
): Promise<number> {
  const res = await execute(
    `INSERT INTO day_log (plan_id, slot_id, date, done, quick_note, duration_min, created_at)
     VALUES ($1, $2, $3, 1, $4, $5, $6)`,
    [planId, slotId, date, quickNote, durationMin, new Date().toISOString()],
  );
  return res.lastInsertId as number;
}

/** Vincula um estudo (arte anexada) a um log de execução. */
export async function setLogStudy(
  logId: number,
  studyId: number,
): Promise<void> {
  await execute("UPDATE day_log SET study_id = $1 WHERE id = $2", [
    studyId,
    logId,
  ]);
}

/** Desfaz: remove o log de uma prática (slot) num dia. */
export async function undoLog(slotId: number, date: string): Promise<void> {
  await execute("DELETE FROM day_log WHERE slot_id = $1 AND date = $2", [
    slotId,
    date,
  ]);
}
