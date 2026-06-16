import { createSignal, createResource, For, Show } from "solid-js";
import Gallery from "../components/Gallery";
import {
  listCollections,
  createCollection,
  deleteCollection,
  studiesInCollection,
} from "../lib/collections";

export default function Collections() {
  const [name, setName] = createSignal("");
  const [selected, setSelected] = createSignal<number | null>(null);

  const [cols, { refetch }] = createResource(listCollections);
  const [studies] = createResource(
    () => selected() ?? false,
    (id) => studiesInCollection(id as number),
  );

  async function add(e: Event) {
    e.preventDefault();
    if (!name().trim()) return;
    await createCollection(name().trim());
    setName("");
    refetch();
  }
  async function remove(id: number) {
    await deleteCollection(id);
    if (selected() === id) setSelected(null);
    refetch();
  }

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Coleções</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Pastas virtuais de estudos (não mexem no vault).
      </p>

      <form onSubmit={add} class="mt-6 flex max-w-md gap-2">
        <input
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="Nova coleção"
          class="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
        />
        <button
          type="submit"
          class="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          Criar
        </button>
      </form>

      <div class="mt-6 flex flex-wrap gap-2">
        <For each={cols() ?? []}>
          {(c) => (
            <span
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors"
              classList={{
                "border-accent-400 bg-accent-50 text-accent-700":
                  selected() === c.id,
                "border-neutral-200 bg-white text-neutral-700":
                  selected() !== c.id,
              }}
            >
              <button onClick={() => setSelected(c.id)}>{c.name}</button>
              <button
                onClick={() => remove(c.id)}
                class="text-neutral-400 hover:text-red-500"
                title="Apagar coleção"
              >
                ✕
              </button>
            </span>
          )}
        </For>
      </div>

      <Show when={selected()}>
        <Gallery studies={studies() ?? []} />
      </Show>
    </div>
  );
}
