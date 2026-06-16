import { select, execute } from "./db";

export type Plan = {
  id: number;
  name: string;
  folder_path: string | null;
  weekly_goal_days: number | null;
  active: number; // 0/1
  created_at: string;
};

export type PlanSlot = {
  id: number;
  plan_id: number;
  weekday: number; // 0=seg .. 6=dom
  technique: string | null;
  subfolder: string | null;
  note: string | null;
};

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

/** Lista planos: ativos primeiro, depois mais recentes. */
export async function listPlans(): Promise<Plan[]> {
  return select<Plan>(
    "SELECT * FROM plan ORDER BY active DESC, created_at DESC",
  );
}

export async function createPlan(
  name: string,
  weeklyGoalDays: number | null,
): Promise<number> {
  const res = await execute(
    "INSERT INTO plan (name, weekly_goal_days, active, created_at) VALUES ($1, $2, 1, $3)",
    [name, weeklyGoalDays, new Date().toISOString()],
  );
  return res.lastInsertId as number;
}

/** Ativa (1) ou arquiva (0) um plano. */
export async function setPlanActive(id: number, active: boolean): Promise<void> {
  await execute("UPDATE plan SET active = $1 WHERE id = $2", [
    active ? 1 : 0,
    id,
  ]);
}

/** Grava o caminho da pasta do plano no vault. */
export async function setPlanFolder(
  id: number,
  folderPath: string,
): Promise<void> {
  await execute("UPDATE plan SET folder_path = $1 WHERE id = $2", [
    folderPath,
    id,
  ]);
}

/** Apaga o plano (cascata: plan_slot; day_log.plan_id vira NULL). Não toca no vault. */
export async function deletePlan(id: number): Promise<void> {
  await execute("DELETE FROM plan WHERE id = $1", [id]);
}

export async function getPlan(id: number): Promise<Plan | null> {
  const rows = await select<Plan>("SELECT * FROM plan WHERE id = $1", [id]);
  return rows[0] ?? null;
}

// ── Slots (template semanal) ────────────────────────────────────────────────
export async function listSlots(planId: number): Promise<PlanSlot[]> {
  return select<PlanSlot>(
    "SELECT * FROM plan_slot WHERE plan_id = $1 ORDER BY weekday, id",
    [planId],
  );
}

export async function addSlot(
  planId: number,
  weekday: number,
  technique: string | null,
  subfolder: string | null,
  note: string | null,
): Promise<number> {
  const res = await execute(
    "INSERT INTO plan_slot (plan_id, weekday, technique, subfolder, note) VALUES ($1, $2, $3, $4, $5)",
    [planId, weekday, technique, subfolder, note],
  );
  return res.lastInsertId as number;
}

export async function deleteSlot(id: number): Promise<void> {
  await execute("DELETE FROM plan_slot WHERE id = $1", [id]);
}
