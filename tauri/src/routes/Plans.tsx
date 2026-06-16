import { createSignal, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { confirm } from "@tauri-apps/plugin-dialog";
import {
  listPlans,
  createPlan,
  setPlanActive,
  setPlanFolder,
  deletePlan,
  type Plan,
} from "../lib/plans";
import { getSetting, VAULT_PATH_KEY } from "../lib/settings";
import { createPlanFolders, deletePlanFolder } from "../lib/api";

export default function Plans() {
  const [plans, setPlans] = createSignal<Plan[]>([]);
  const [name, setName] = createSignal("");
  const [goal, setGoal] = createSignal<number | "">("");
  const [msg, setMsg] = createSignal<string | null>(null);

  async function reload() {
    setPlans(await listPlans());
  }
  onMount(reload);

  /** Cria a pasta do plano no vault (idempotente) e grava o caminho. */
  async function ensureFolder(id: number, planName: string) {
    const vault = await getSetting(VAULT_PATH_KEY);
    if (!vault) {
      setMsg("Defina a pasta do vault em Configurações antes de criar pastas.");
      return;
    }
    try {
      const folder = await createPlanFolders(vault, planName, []);
      await setPlanFolder(id, folder);
      setMsg(null);
    } catch (e) {
      setMsg(`Erro ao criar pasta: ${e}`);
    }
  }

  async function submit(e: Event) {
    e.preventDefault();
    const n = name().trim();
    if (!n) return;
    const id = await createPlan(n, goal() === "" ? null : Number(goal()));
    await ensureFolder(id, n);
    setName("");
    setGoal("");
    await reload();
  }

  async function toggle(p: Plan) {
    await setPlanActive(p.id, p.active === 0);
    await reload();
  }

  async function makeFolder(p: Plan) {
    await ensureFolder(p.id, p.name);
    await reload();
  }

  async function removePlan(p: Plan) {
    const warn = p.folder_path
      ? `\n\n⚠️ A pasta e TODO o conteúdo serão apagados PERMANENTEMENTE:\n${p.folder_path}`
      : "";
    const ok = await confirm(`Apagar o plano "${p.name}"?${warn}`, {
      title: "Apagar plano",
      kind: "warning",
      okLabel: "Apagar",
      cancelLabel: "Cancelar",
    });
    if (!ok) return;
    try {
      if (p.folder_path) {
        const vault = await getSetting(VAULT_PATH_KEY);
        if (vault) await deletePlanFolder(vault, p.folder_path);
      }
      await deletePlan(p.id);
      setMsg(null);
    } catch (e) {
      setMsg(`Erro ao apagar: ${e}`);
    }
    await reload();
  }

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Planos</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Planos de estudo com meta semanal. Ative os que está praticando agora.
      </p>

      <form onSubmit={submit} class="mt-6 flex max-w-2xl items-end gap-3">
        <label class="flex-1">
          <span class="block text-xs font-medium text-neutral-600">Nome</span>
          <input
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="Ex.: Fundamentos de gesture"
            class="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
          />
        </label>
        <label class="w-40">
          <span class="block text-xs font-medium text-neutral-600">
            Meta semanal (dias)
          </span>
          <input
            type="number"
            min="1"
            max="7"
            value={goal()}
            onInput={(e) =>
              setGoal(e.currentTarget.value === "" ? "" : +e.currentTarget.value)
            }
            placeholder="5"
            class="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
          />
        </label>
        <button
          type="submit"
          class="shrink-0 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
        >
          Criar plano
        </button>
      </form>

      <Show when={msg()}>
        <p class="mt-3 max-w-2xl rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {msg()}
        </p>
      </Show>

      <ul class="mt-8 max-w-2xl divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
        <Show
          when={plans().length > 0}
          fallback={
            <li class="px-4 py-6 text-center text-sm text-neutral-400">
              Nenhum plano ainda.
            </li>
          }
        >
          <For each={plans()}>
            {(p) => (
              <li class="flex items-center gap-3 px-4 py-3">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <A
                      href={`/planos/${p.id}`}
                      class="font-medium text-accent-700 hover:underline"
                    >
                      {p.name}
                    </A>
                    <Show
                      when={p.active === 1}
                      fallback={
                        <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                          arquivado
                        </span>
                      }
                    >
                      <span class="rounded-full bg-accent-100 px-2 py-0.5 text-xs text-accent-700">
                        ativo
                      </span>
                    </Show>
                  </div>
                  <span class="text-xs text-neutral-500">
                    {p.weekly_goal_days
                      ? `meta: ${p.weekly_goal_days} dias/semana`
                      : "sem meta semanal"}
                  </span>
                  <Show
                    when={p.folder_path}
                    fallback={
                      <span class="block truncate text-xs text-neutral-400">
                        sem pasta no vault
                      </span>
                    }
                  >
                    <span
                      class="block truncate text-xs text-neutral-400"
                      title={p.folder_path!}
                    >
                      📁 {p.folder_path}
                    </span>
                  </Show>
                </div>
                <A
                  href={`/planos/${p.id}`}
                  class="shrink-0 rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-600"
                >
                  Abrir
                </A>
                <Show when={!p.folder_path}>
                  <button
                    type="button"
                    onClick={() => makeFolder(p)}
                    class="shrink-0 rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
                  >
                    Criar pasta
                  </button>
                </Show>
                <button
                  type="button"
                  onClick={() => toggle(p)}
                  class="shrink-0 rounded-md border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100"
                >
                  {p.active === 1 ? "Arquivar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => removePlan(p)}
                  class="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  Apagar
                </button>
              </li>
            )}
          </For>
        </Show>
      </ul>
    </div>
  );
}
