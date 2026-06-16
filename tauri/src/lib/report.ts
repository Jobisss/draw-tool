import { select } from "./db";

export type ReportData = {
  practiceDays: number;
  totalMin: number;
  studyCount: number;
  byTechnique: { name: string; count: number }[];
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
  const bt = await select<{ name: string; count: number }>(
    `SELECT t.name AS name, COUNT(*) AS count
       FROM study s
       JOIN study_tag st ON st.study_id = s.id
       JOIN tag t ON t.id = st.tag_id
      WHERE t.category = 'tecnica' AND date(s.created_at) BETWEEN $1 AND $2
      GROUP BY t.id ORDER BY count DESC`,
    [start, end],
  );
  return {
    practiceDays: pd[0]?.n ?? 0,
    totalMin: tm[0]?.m ?? 0,
    studyCount: sc[0]?.n ?? 0,
    byTechnique: bt,
  };
}
