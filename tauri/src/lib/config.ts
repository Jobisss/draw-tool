import { select, execute } from "./db";
import type { Plan, PlanSlot } from "./plans";
import { updateNote, type Note } from "./notes";
import type { Collection } from "./collections";

// Export/import de configuração: planos + horários (slots), coleções e notas.
// Não inclui estudos (dependem do vault) nem settings (machine-específicas como
// vault_path). Caminhos de pasta dos planos NÃO são exportados (são locais);
// recrie a pasta pelo botão "Criar pasta" após importar.

export const CONFIG_FORMAT = "draw-study-config";
export const CONFIG_VERSION = 1;

type SlotExport = {
  weekday: number;
  technique: string | null;
  subfolder: string | null;
  note: string | null;
};
type PlanExport = {
  name: string;
  weekly_goal_days: number | null;
  active: number;
  slots: SlotExport[];
};
type NoteExport = { title: string; body_md: string };

export type ConfigFile = {
  format: typeof CONFIG_FORMAT;
  version: number;
  exported_at: string;
  plans: PlanExport[];
  collections: string[];
  notes: NoteExport[];
};

export type ImportResult = {
  plans: number;
  slots: number;
  collections: number;
  notes: number;
};

/** Monta o objeto de config a partir do banco. */
export async function buildConfig(): Promise<ConfigFile> {
  const plans = await select<Plan>("SELECT * FROM plan ORDER BY id");
  const slots = await select<PlanSlot>("SELECT * FROM plan_slot ORDER BY id");
  const collections = await select<Collection>(
    "SELECT * FROM collection ORDER BY name",
  );
  const notes = await select<Note>("SELECT * FROM note ORDER BY id");

  const slotsByPlan = new Map<number, SlotExport[]>();
  for (const s of slots) {
    const arr = slotsByPlan.get(s.plan_id) ?? [];
    arr.push({
      weekday: s.weekday,
      technique: s.technique,
      subfolder: s.subfolder,
      note: s.note,
    });
    slotsByPlan.set(s.plan_id, arr);
  }

  return {
    format: CONFIG_FORMAT,
    version: CONFIG_VERSION,
    exported_at: new Date().toISOString(),
    plans: plans.map((p) => ({
      name: p.name,
      weekly_goal_days: p.weekly_goal_days,
      active: p.active,
      slots: slotsByPlan.get(p.id) ?? [],
    })),
    collections: collections.map((c) => c.name),
    notes: notes.map((n) => ({ title: n.title, body_md: n.body_md })),
  };
}

/** Serializa a config atual em JSON indentado. */
export async function exportConfigJson(): Promise<string> {
  return JSON.stringify(await buildConfig(), null, 2);
}

function isConfigFile(x: unknown): x is ConfigFile {
  const c = x as ConfigFile;
  return (
    !!c &&
    c.format === CONFIG_FORMAT &&
    Array.isArray(c.plans) &&
    Array.isArray(c.collections) &&
    Array.isArray(c.notes)
  );
}

/**
 * Importa uma config (de JSON). Sempre ADICIONA como novo (nunca sobrescreve
 * nem apaga). Planos e notas viram entradas novas; coleções de nome já
 * existente são puladas (nome é único no schema). Retorna contagens.
 */
export async function importConfigJson(json: string): Promise<ImportResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Arquivo inválido: não é JSON.");
  }
  if (!isConfigFile(parsed)) {
    throw new Error("Arquivo não é uma config do draw-study.");
  }

  const result: ImportResult = { plans: 0, slots: 0, collections: 0, notes: 0 };
  const now = new Date().toISOString();

  // Planos + slots (sempre novos; folder_path fica NULL — caminho é local).
  for (const p of parsed.plans) {
    const r = await execute(
      "INSERT INTO plan (name, weekly_goal_days, active, created_at) VALUES ($1, $2, $3, $4)",
      [p.name, p.weekly_goal_days ?? null, p.active ?? 1, now],
    );
    const planId = r.lastInsertId as number;
    result.plans++;
    for (const s of p.slots ?? []) {
      await execute(
        "INSERT INTO plan_slot (plan_id, weekday, technique, subfolder, note) VALUES ($1, $2, $3, $4, $5)",
        [planId, s.weekday, s.technique ?? null, s.subfolder ?? null, s.note ?? null],
      );
      result.slots++;
    }
  }

  // Coleções (nome é UNIQUE → pula duplicados).
  for (const name of parsed.collections) {
    const r = await execute(
      "INSERT OR IGNORE INTO collection (name) VALUES ($1)",
      [name],
    );
    if ((r.rowsAffected ?? 0) > 0) result.collections++;
  }

  // Notas (sempre novas). Insere todas, depois re-sincroniza note_link (resolve
  // `[[Título]]` por título) — assim wikilinks entre notas importadas ligam.
  const newNoteIds: number[] = [];
  for (const n of parsed.notes) {
    const r = await execute(
      "INSERT INTO note (title, body_md, created_at, updated_at) VALUES ($1, $2, $3, $3)",
      [n.title, n.body_md ?? "", now],
    );
    newNoteIds.push(r.lastInsertId as number);
    result.notes++;
  }
  for (let i = 0; i < newNoteIds.length; i++) {
    const n = parsed.notes[i];
    await updateNote(newNoteIds[i], n.title, n.body_md ?? "");
  }

  return result;
}
