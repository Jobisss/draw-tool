import { createSignal, createResource, For, Show } from "solid-js";
import Gallery from "../components/Gallery";
import {
  timelineStudies,
  groupByMonth,
  techniqueTags,
} from "../lib/timeline";

export default function Timeline() {
  const [tech, setTech] = createSignal("");

  const [studies] = createResource(
    () => ({ tech: tech() }),
    (s) => timelineStudies(s.tech ? Number(s.tech) : undefined),
  );
  const [techs] = createResource(techniqueTags);

  const groups = () => groupByMonth(studies() ?? []);

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Timeline</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Evolução cronológica dos estudos, agrupada por mês.
      </p>

      <div class="mt-6 flex items-center gap-3">
        <select
          value={tech()}
          onChange={(e) => setTech(e.currentTarget.value)}
          class="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
        >
          <option value="">Todas as técnicas</option>
          <For each={techs() ?? []}>
            {(t) => <option value={t.id}>{t.name}</option>}
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
            Nenhum estudo com data ainda. Indexe o vault em Configurações.
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
