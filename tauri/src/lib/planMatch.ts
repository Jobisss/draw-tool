import { select } from "./db";
import { listPlans, type Plan } from "./plans";

export type PlanCount = { name: string; count: number };

function norm(p: string): string {
  return p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
}

/** A qual plano um estudo pertence (pela pasta no vault). Mais específico vence. */
export function studyPlan(path: string, plans: Plan[]): Plan | null {
  const np = norm(path);
  let best: Plan | null = null;
  let bestLen = -1;
  for (const pl of plans) {
    if (!pl.folder_path) continue;
    const f = norm(pl.folder_path);
    if ((np === f || np.startsWith(f + "/")) && f.length > bestLen) {
      best = pl;
      bestLen = f.length;
    }
  }
  return best;
}

function group(
  studies: { path: string }[],
  plans: Plan[],
): PlanCount[] {
  const counts = new Map<string, number>();
  for (const s of studies) {
    const pl = studyPlan(s.path, plans);
    const key = pl ? pl.name : "Sem plano";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Contagem de estudos por plano (todos). */
export async function studiesByPlan(): Promise<PlanCount[]> {
  const plans = await listPlans();
  const studies = await select<{ path: string }>("SELECT path FROM study");
  return group(studies, plans);
}

/** Contagem de estudos por plano num período [start,end] (created_at). */
export async function studiesByPlanRange(
  start: string,
  end: string,
): Promise<PlanCount[]> {
  const plans = await listPlans();
  const studies = await select<{ path: string }>(
    "SELECT path FROM study WHERE date(created_at) BETWEEN $1 AND $2",
    [start, end],
  );
  return group(studies, plans);
}
