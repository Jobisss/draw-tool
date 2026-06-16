import { createSignal, createResource, For, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { listNotes, createNote } from "../lib/notes";

export default function Notes() {
  const [title, setTitle] = createSignal("");
  const [notes, { refetch }] = createResource(listNotes);
  const navigate = useNavigate();

  async function add(e: Event) {
    e.preventDefault();
    if (!title().trim()) return;
    const id = await createNote(title().trim());
    setTitle("");
    refetch();
    navigate(`/notas/${id}`);
  }

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Notas</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Notas em markdown. Use <code>[[Título]]</code> para vincular outras notas.
      </p>

      <form onSubmit={add} class="mt-6 flex max-w-md gap-2">
        <input
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          placeholder="Título da nota"
          class="flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
        />
        <button
          type="submit"
          class="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          Nova nota
        </button>
      </form>

      <ul class="mt-6 max-w-md divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
        <Show
          when={(notes() ?? []).length > 0}
          fallback={
            <li class="px-4 py-6 text-center text-sm text-neutral-400">
              Nenhuma nota ainda.
            </li>
          }
        >
          <For each={notes()}>
            {(n) => (
              <li>
                <A
                  href={`/notas/${n.id}`}
                  class="block px-4 py-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  {n.title}
                </A>
              </li>
            )}
          </For>
        </Show>
      </ul>
    </div>
  );
}
