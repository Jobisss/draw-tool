import { createSignal, createResource, For, Show } from "solid-js";
import Gallery from "../components/Gallery";
import DropZone from "../components/DropZone";
import { listStudies, distinctFormats } from "../lib/studies";
import { scanVault, generateMissingThumbnails } from "../lib/indexer";
import { listCollections } from "../lib/collections";

export default function Library() {
  const [search, setSearch] = createSignal("");
  const [format, setFormat] = createSignal("");
  const [collection, setCollection] = createSignal("");

  const [studies, { refetch }] = createResource(
    () => ({
      search: search(),
      format: format(),
      collectionId: collection() ? Number(collection()) : undefined,
    }),
    (opts) => listStudies(opts),
  );
  const [formats, { refetch: refetchFormats }] =
    createResource(distinctFormats);
  const [collections] = createResource(listCollections);

  async function onImported() {
    await scanVault();
    await generateMissingThumbnails();
    refetch();
    refetchFormats();
  }

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Biblioteca</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Estudos indexados do vault. Indexe em Configurações.
      </p>

      <div class="mt-4">
        <DropZone onImported={onImported} />
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          placeholder="Buscar por nome ou tag…"
          class="w-64 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
        />
        <select
          value={format()}
          onChange={(e) => setFormat(e.currentTarget.value)}
          class="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
        >
          <option value="">Todos formatos</option>
          <For each={formats() ?? []}>
            {(f) => <option value={f}>{f}</option>}
          </For>
        </select>
        <select
          value={collection()}
          onChange={(e) => setCollection(e.currentTarget.value)}
          class="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
        >
          <option value="">Todas coleções</option>
          <For each={collections() ?? []}>
            {(c) => <option value={c.id}>{c.name}</option>}
          </For>
        </select>
        <Show when={studies()}>
          <span class="text-sm text-neutral-500">
            {studies()!.length} estudos
          </span>
        </Show>
      </div>

      <Show
        when={!studies.loading}
        fallback={<p class="mt-6 text-sm text-neutral-400">carregando…</p>}
      >
        <Gallery studies={studies() ?? []} />
      </Show>
    </div>
  );
}
