import { createSignal, createResource, For, Show } from "solid-js";
import Gallery from "../components/Gallery";
import FlipBook from "../components/FlipBook";
import { timelineStudies, groupByMonth } from "../lib/timeline";
import { listPlans } from "../lib/plans";

export default function Timeline() {
  const [planId, setPlanId] = createSignal("");
  const [view, setView] = createSignal<"gallery" | "book">("gallery");
  const [collapsedMonths, setCollapsedMonths] = createSignal<Set<string>>(new Set());

  const [studies] = createResource(
    () => ({ plan: planId() }),
    (s) =>
      timelineStudies({
        planId: s.plan ? Number(s.plan) : undefined,
      }),
  );
  const [plans] = createResource(listPlans);

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
        <Show when={studies()}>
          <span class="text-sm text-muted font-serif">
            {studies()!.length} estudos
          </span>
        </Show>

        <div class="ml-auto flex items-center gap-2">
          {/* Alternar Galeria / Livro */}
          <div class="flex rounded-md border border-line overflow-hidden text-xs">
            <button
              onClick={() => setView("gallery")}
              class="px-3 py-1.5 transition-colors"
              classList={{
                "bg-accent-500 text-white": view() === "gallery",
                "bg-surface text-ink hover:bg-surface2": view() !== "gallery",
              }}
            >
              Galeria
            </button>
            <button
              onClick={() => setView("book")}
              class="px-3 py-1.5 transition-colors"
              classList={{
                "bg-accent-500 text-white": view() === "book",
                "bg-surface text-ink hover:bg-surface2": view() !== "book",
              }}
            >
              📖 Livro
            </button>
          </div>

          <Show when={view() === "gallery" && groups().length > 0}>
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
          </Show>
        </div>
      </div>

      <Show when={view() === "book"}>
        <Show
          when={(studies()?.length ?? 0) > 0}
          fallback={
            <p class="mt-8 text-sm text-faint">
              Nenhum estudo com data no filtro atual.
            </p>
          }
        >
          {/* keyed: remonta o livro quando o filtro muda */}
          <Show when={[...(studies() ?? [])].reverse()} keyed>
            {(book) => (
              <div class="mt-8">
                <FlipBook studies={book} />
              </div>
            )}
          </Show>
        </Show>
      </Show>

      <Show
        when={view() === "gallery" && groups().length > 0}
        fallback={
          <Show when={view() === "gallery"}>
            <p class="mt-8 text-sm text-faint">
              Nenhum estudo com data no filtro atual.
            </p>
          </Show>
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
