import { select } from "./db";
import type { Study } from "./studies";

export type MonthGroup = { month: string; label: string; studies: Study[] };

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[(m || 1) - 1]} ${y}`;
}

function getPathWithoutExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return filePath;
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastDot > lastSlash) {
    return filePath.slice(0, lastDot);
  }
  return filePath;
}

/** Estudos p/ a timeline, filtrando por tag (qualquer) e/ou plano (via day_log). */
export async function timelineStudies(
  opts: { tagId?: number; planId?: number } = {},
): Promise<Study[]> {
  const where: string[] = ["s.created_at IS NOT NULL"];
  const params: unknown[] = [];
  if (opts.tagId) {
    params.push(opts.tagId);
    where.push(
      `EXISTS(SELECT 1 FROM study_tag st WHERE st.study_id = s.id AND st.tag_id = $${params.length})`,
    );
  }
  if (opts.planId) {
    params.push(opts.planId);
    where.push(
      `EXISTS(SELECT 1 FROM day_log dl WHERE dl.study_id = s.id AND dl.plan_id = $${params.length})`,
    );
  }

  const rows = await select<Study>(
    `SELECT s.* FROM study s WHERE ${where.join(" AND ")} ORDER BY s.created_at DESC`,
    params,
  );

  // Filtra duplicados (mesmo nome/caminho sem extensão), priorizando PNG
  const groups = new Map<string, Study[]>();
  for (const s of rows) {
    const key = getPathWithoutExtension(s.path).toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(s);
  }

  const filtered: Study[] = [];
  for (const group of groups.values()) {
    if (group.length > 1) {
      const pngStudy = group.find((s) => s.format.toLowerCase() === "png");
      if (pngStudy) {
        filtered.push(pngStudy);
        continue;
      }
    }
    filtered.push(...group);
  }
  return filtered;
}

export function groupByMonth(studies: Study[]): MonthGroup[] {
  const map = new Map<string, Study[]>();
  for (const s of studies) {
    const m = (s.created_at ?? "").slice(0, 7);
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(s);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, list]) => ({ month, label: monthLabel(month), studies: list }));
}
