import { select } from "./db";
import { consistency, type Consistency } from "./consistency";

export type DashStats = {
  studyCount: number;
  totalMin: number;
  consistency: Consistency;
};

export async function dashboardStats(): Promise<DashStats> {
  const sc = await select<{ n: number }>("SELECT COUNT(*) AS n FROM study");
  const mins = await select<{ m: number | null }>(
    "SELECT SUM(duration_min) AS m FROM day_log WHERE done = 1",
  );
  const cons = await consistency();
  return {
    studyCount: sc[0]?.n ?? 0,
    totalMin: mins[0]?.m ?? 0,
    consistency: cons,
  };
}

/** Mapa date(YYYY-MM-DD) → nº de logs feitos no dia (p/ heatmap). */
export async function logHeatmap(): Promise<Map<string, number>> {
  const rows = await select<{ date: string; count: number }>(
    "SELECT date, COUNT(*) AS count FROM day_log WHERE done = 1 GROUP BY date",
  );
  return new Map(rows.map((r) => [r.date, r.count]));
}

export { studiesByPlan } from "./planMatch";
export type { PlanCount } from "./planMatch";
