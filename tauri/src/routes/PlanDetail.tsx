import { createSignal, onMount, For, Show } from "solid-js";
import { useParams, A } from "@solidjs/router";
import {
  getPlan,
  listSlots,
  addSlot,
  deleteSlot,
  WEEKDAYS,
  type Plan,
  type PlanSlot,
} from "../lib/plans";

export default function PlanDetail() {
  const params = useParams();
  const planId = () => Number(params.id);

  const [plan, setPlan] = createSignal<Plan | null>(null);
  const [slots, setSlots] = createSignal<PlanSlot[]>([]);

  const [weekday, setWeekday] = createSignal(0);
  const [technique, setTechnique] = createSignal("");
  const [subfolder, setSubfolder] = createSignal("");
  const [note, setNote] = createSignal("");

  async function reload() {
    setPlan(await getPlan(planId()));
    setSlots(await listSlots(planId()));
  }
  onMount(reload);

  async function submit(e: Event) {
    e.preventDefault();
    if (!technique().trim() && !subfolder().trim() && !note().trim()) return;
    await addSlot(
      planId(),
      weekday(),
      technique().trim() || null,
      subfolder().trim() || null,
      note().trim() || null,
    );
    setTechnique("");
    setSubfolder("");
    setNote("");
    await reload();
  }

  async function remove(id: number) {
    await deleteSlot(id);
    await reload();
  }

  const slotsForDay = (wd: number) => slots().filter((s) => s.weekday === wd);

  return (
    <div class="p-8">
      <A href="/planos" class="text-sm text-neutral-500 hover:text-accent-700">
        ← Planos
      </A>
      <h1 class="mt-2 text-2xl font-semibold tracking-tight">
        {plan()?.name ?? "Plano"}
      </h1>
      <p class="mt-1 text-sm text-neutral-500">
        Template semanal: o que praticar em cada dia da semana.
      </p>

      <form
        onSubmit={submit}
        class="mt-6 flex max-w-3xl flex-wrap items-end gap-3"
      >
        <label>
          <span class="block text-xs font-medium text-neutral-600">Dia</span>
          <select
            value={weekday()}
            onChange={(e) => setWeekday(+e.currentTarget.value)}
            class="mt-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
          >
            <For each={WEEKDAYS}>
              {(d, i) => <option value={i()}>{d}</option>}
            </For>
          </select>
        </label>
        <label class="flex-1">
          <span class="block text-xs font-medium text-neutral-600">Técnica</span>
          <input
            value={technique()}
            onInput={(e) => setTechnique(e.currentTarget.value)}
            placeholder="gesture"
            class="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
          />
        </label>
        <label class="flex-1">
          <span class="block text-xs font-medium text-neutral-600">
            Subpasta
          </span>
          <input
            value={subfolder()}
            onInput={(e) => setSubfolder(e.currentTarget.value)}
            placeholder="gesture"
            class="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
          />
        </label>
        <label class="flex-1">
          <span class="block text-xs font-medium text-neutral-600">
            Lição/nota
          </span>
          <input
            value={note()}
            onInput={(e) => setNote(e.currentTarget.value)}
            placeholder="lição 3"
            class="mt-1 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
          />
        </label>
        <button
          type="submit"
          class="shrink-0 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
        >
          Adicionar
        </button>
      </form>

      <div class="mt-8 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <For each={WEEKDAYS}>
          {(d, i) => (
            <div class="rounded-md border border-neutral-200 bg-white p-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {d}
              </h3>
              <ul class="mt-2 space-y-2">
                <Show
                  when={slotsForDay(i()).length > 0}
                  fallback={
                    <li class="text-xs text-neutral-300">—</li>
                  }
                >
                  <For each={slotsForDay(i())}>
                    {(s) => (
                      <li class="group flex items-start justify-between gap-2 rounded bg-neutral-50 px-2 py-1.5 text-sm">
                        <div class="min-w-0">
                          <span class="font-medium text-neutral-800">
                            {s.technique ?? "—"}
                          </span>
                          <Show when={s.subfolder}>
                            <span class="block truncate text-xs text-neutral-500">
                              📁 {s.subfolder}
                            </span>
                          </Show>
                          <Show when={s.note}>
                            <span class="block truncate text-xs text-neutral-500">
                              {s.note}
                            </span>
                          </Show>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(s.id)}
                          class="shrink-0 text-neutral-300 hover:text-red-500"
                          title="Remover"
                        >
                          ✕
                        </button>
                      </li>
                    )}
                  </For>
                </Show>
              </ul>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
