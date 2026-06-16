import { createSignal, createResource, For, Show } from "solid-js";
import Gallery from "../components/Gallery";
import { timelineStudies, groupByMonth } from "../lib/timeline";
import { listPlans } from "../lib/plans";
import { listTags } from "../lib/tags";

export default function Timeline() {
  const [planId, setPlanId] = createSignal("");
  const [tagId, setTagId] = createSignal("");

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

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Timeline</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Evolução cronológica dos estudos, agrupada por mês.
      </p>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <select
          value={planId()}
          onChange={(e) => setPlanId(e.currentTarget.value)}
          class="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
        >
          <option value="">Todos os planos</option>
          <For each={plans() ?? []}>
            {(p) => <option value={p.id}>{p.name}</option>}
          </For>
        </select>
        <select
          value={tagId()}
          onChange={(e) => setTagId(e.currentTarget.value)}
          class="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
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
          <span class="text-sm text-neutral-500">
            {studies()!.length} estudos
          </span>
        </Show>
      </div>

      <Show
        when={groups().length > 0}
        fallback={
          <p class="mt-8 text-sm text-neutral-400">
            Nenhum estudo com data no filtro atual.
          </p>
        }
      >
        <div class="mt-8 space-y-10">
          <For each={groups()}>
            {(g) => (
              <section>
                <h2 class="sticky top-0 bg-neutral-50/90 py-1 text-sm font-semibold capitalize text-neutral-700 backdrop-blur">
                  {g.label}{" "}
                  <span class="font-normal text-neutral-400">
                    · {g.studies.length}
                  </span>
                </h2>
                <Gallery studies={g.studies} />
              </section>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
