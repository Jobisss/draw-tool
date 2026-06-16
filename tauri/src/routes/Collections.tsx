import { createSignal, createResource, createEffect, For, Show } from "solid-js";
import { confirm } from "@tauri-apps/plugin-dialog";
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

  // auto-seleciona a primeira coleção p/ já mostrar as imagens
  createEffect(() => {
    const list = cols();
    if (list && list.length > 0 && selected() === null) {
      setSelected(list[0].id);
    }
  });

  async function add(e: Event) {
    e.preventDefault();
    if (!name().trim()) return;
    await createCollection(name().trim());
    setName("");
    refetch();
  }
  async function remove(id: number, name: string) {
    const ok = await confirm(
      `Apagar a coleção "${name}"?\n\nOs estudos NÃO são apagados — só a coleção e seus vínculos.`,
      { title: "Apagar coleção", kind: "warning", okLabel: "Apagar" },
    );
    if (!ok) return;
    await deleteCollection(id);
    if (selected() === id) setSelected(null);
    refetch();
  }

  const currentName = () => cols()?.find((c) => c.id === selected())?.name ?? "";

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Coleções</h1>
      <p class="mt-1 text-sm text-muted">
        Pastas virtuais de estudos (não mexem no vault).
      </p>

      <form onSubmit={add} class="mt-6 flex max-w-md gap-2">
        <input
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="Nova coleção"
          class="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent-500"
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
            <button
              type="button"
              onClick={() => setSelected(c.id)}
              class="rounded-full border px-3 py-1 text-sm transition-colors"
              classList={{
                "border-accent-500 bg-accent-500/10 text-accent-300 font-medium":
                  selected() === c.id,
                "border-line bg-surface text-ink hover:bg-bg":
                  selected() !== c.id,
              }}
            >
              {c.name}
            </button>
          )}
        </For>
      </div>

      <Show when={selected()}>
        <div class="mt-6 flex items-center justify-between">
          <p class="text-sm text-muted">
            <span class="font-medium text-ink">{currentName()}</span> ·{" "}
            {(studies() ?? []).length} imagem(ns)
          </p>
          <button
            type="button"
            onClick={() => remove(selected()!, currentName())}
            class="rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
          >
            Apagar coleção
          </button>
        </div>
        <Gallery studies={studies() ?? []} />
      </Show>
    </div>
  );
}
