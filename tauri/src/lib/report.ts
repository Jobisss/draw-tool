import { select } from "./db";
import { studiesByPlanRange, type PlanCount } from "./planMatch";

export type ReportData = {
  practiceDays: number;
  totalMin: number;
  studyCount: number;
  byPlan: PlanCount[];
};

/** Resumo de um período [start, end] (YYYY-MM-DD, inclusivo). */
export async function reportData(
  start: string,
  end: string,
): Promise<ReportData> {
  const pd = await select<{ n: number }>(
    "SELECT COUNT(DISTINCT date) AS n FROM day_log WHERE done = 1 AND date BETWEEN $1 AND $2",
    [start, end],
  );
  const tm = await select<{ m: number | null }>(
    "SELECT SUM(duration_min) AS m FROM day_log WHERE done = 1 AND date BETWEEN $1 AND $2",
    [start, end],
  );
  const sc = await select<{ n: number }>(
    "SELECT COUNT(*) AS n FROM study WHERE date(created_at) BETWEEN $1 AND $2",
    [start, end],
  );
  const bp = await studiesByPlanRange(start, end);
  return {
    practiceDays: pd[0]?.n ?? 0,
    totalMin: tm[0]?.m ?? 0,
    studyCount: sc[0]?.n ?? 0,
    byPlan: bp,
  };
}
