import { select } from "./db";
import type { Study } from "./studies";
import type { Tag } from "./tags";

export type MonthGroup = { month: string; label: string; studies: Study[] };

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[(m || 1) - 1]} ${y}`;
}

/** Tags de categoria 'tecnica' (p/ o filtro). */
export async function techniqueTags(): Promise<Tag[]> {
  return select<Tag>(
    "SELECT * FROM tag WHERE category = 'tecnica' ORDER BY name",
  );
}

export async function timelineStudies(
  techniqueTagId?: number,
): Promise<Study[]> {
  if (techniqueTagId) {
    return select<Study>(
      `SELECT s.* FROM study s
         JOIN study_tag st ON st.study_id = s.id
        WHERE st.tag_id = $1 AND s.created_at IS NOT NULL
        ORDER BY s.created_at DESC`,
      [techniqueTagId],
    );
  }
  return select<Study>(
    "SELECT * FROM study WHERE created_at IS NOT NULL ORDER BY created_at DESC",
  );
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
