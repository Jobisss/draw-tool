import { createSignal, createResource, For, Show } from "solid-js";
import Gallery from "../components/Gallery";
import { timelineStudies, groupByMonth } from "../lib/timeline";
import { listPlans } from "../lib/plans";
import { listTags } from "../lib/tags";

export default function Timeline() {
  const [planId, setPlanId] = createSignal("");
  const [tagId, setTagId] = createSignal("");
  const [collapsedMonths, setCollapsedMonths] = createSignal<Set<string>>(new Set());

  const [studies] = createResource(
    () => ({ plan: planId(), tag: tagId() }),
    (s) =>
      timelineStudies({
        planId: s.plan ? Number(s.plan) : undefined,
        tagId: s.tag ? Number(s.tag) : undefined,
      }),
  );
  const [plans] = createResource(listPlans);
  const [tags] = createResource(listTags);

  const groups = () => groupByMonth(studies() ?? []);

  function toggleMonth(month: string) {
    const s = new Set(collapsedMonths());
    if (s.has(month)) {
      s.delete(month);
    } else {
      s.add(month);
    }
    setCollapsedMonths(s);
  }

  function collapseAll() {
    const months = groups().map((g) => g.month);
    setCollapsedMonths(new Set(months));
  }

  function expandAll() {
    setCollapsedMonths(new Set());
  }

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Timeline</h1>
      <p class="mt-1 text-sm text-muted">
        Evolução cronológica dos estudos, agrupada por mês.
      </p>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={planId()}
          onChange={(e) => setPlanId(e.currentTarget.value)}
          class="rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent-500"
        >
          <option value="">Todos os planos</option>
          <For each={plans() ?? []}>
            {(p) => <option value={p.id}>{p.name}</option>}
          </For>
        </select>
        <select
          value={tagId()}
          onChange={(e) => setTagId(e.currentTarget.value)}
          class="rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent-500"
        >
          <option value="">Todas as tags</option>
          <For each={tags() ?? []}>
            {(t) => (
              <option value={t.id}>
                {t.category ? `${t.category}: ` : ""}
                {t.name}
              </option>
            )}
          </For>
        </select>
        <Show when={studies()}>
          <span class="text-sm text-muted font-serif">
            {studies()!.length} estudos
          </span>
        </Show>

        <Show when={groups().length > 0}>
          <div class="ml-auto flex gap-2">
            <button
              onClick={collapseAll}
              class="rounded bg-surface2 px-2.5 py-1 text-xs border border-line hover:bg-line text-ink transition-colors"
            >
              Recolher todos
            </button>
            <button
              onClick={expandAll}
              class="rounded bg-surface2 px-2.5 py-1 text-xs border border-line hover:bg-line text-ink transition-colors"
            >
              Expandir todos
            </button>
          </div>
        </Show>
      </div>

      <Show
        when={groups().length > 0}
        fallback={
          <p class="mt-8 text-sm text-faint">
            Nenhum estudo com data no filtro atual.
          </p>
        }
      >
        <div class="mt-8 space-y-10">
          <For each={groups()}>
            {(g) => {
              const isCollapsed = () => collapsedMonths().has(g.month);
              return (
                <section class="border-b border-line/20 pb-4 last:border-0 last:pb-0">
                  <h2
                    onClick={() => toggleMonth(g.month)}
                    class="sticky top-0 z-10 bg-bg/90 py-2 text-sm font-semibold capitalize text-ink backdrop-blur cursor-pointer hover:text-accent-400 flex items-center justify-between select-none border-b border-line/50 transition-colors"
                  >
                    <span>
                      {g.label}{" "}
                      <span class="font-normal text-faint">
                        · {g.studies.length}
                      </span>
                    </span>
                    <span class="text-xs text-muted font-mono font-normal mr-2 hover:text-accent-400">
                      {isCollapsed() ? "[ Expandir + ]" : "[ Recolher - ]"}
                    </span>
                  </h2>
                  <Show when={!isCollapsed()}>
                    <div class="mt-2 animate-fade-in">
                      <Gallery studies={g.studies} />
                    </div>
                  </Show>
                </section>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
