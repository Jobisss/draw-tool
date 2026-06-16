import {
  createSignal,
  createResource,
  createEffect,
  createMemo,
  For,
  Show,
} from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import MarkdownIt from "markdown-it";
import {
  getNote,
  updateNote,
  deleteNote,
  backlinks,
  listNotes,
} from "../lib/notes";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

export default function NoteDetail() {
  const params = useParams();
  const id = () => Number(params.id);
  const navigate = useNavigate();

  const [note, { refetch }] = createResource(id, getNote);
  const [links, { refetch: refetchLinks }] = createResource(id, backlinks);
  const [allNotes, { refetch: refetchAll }] = createResource(listNotes);

  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [saved, setSaved] = createSignal(false);

  createEffect(() => {
    const n = note();
    if (n) {
      setTitle(n.title);
      setBody(n.body_md);
    }
  });

  const byTitle = createMemo(
    () =>
      new Map((allNotes() ?? []).map((n) => [n.title.toLowerCase(), n.id])),
  );

  const html = createMemo(() => {
    const replaced = body().replace(/\[\[([^\]\[]+)\]\]/g, (_m, t) => {
      const tid = byTitle().get(t.trim().toLowerCase());
      return tid ? `[${t.trim()}](/notas/${tid})` : t.trim();
    });
    return md.render(replaced);
  });

  async function save() {
    await updateNote(id(), title().trim() || "Sem título", body());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    refetch();
    refetchLinks();
    refetchAll();
  }

  async function remove() {
    await deleteNote(id());
    navigate("/notas");
  }

  return (
    <div class="p-8">
      <A href="/notas" class="text-sm text-neutral-500 hover:text-accent-700">
        ← Notas
      </A>

      <Show when={note()} fallback={<p class="mt-4 text-neutral-400">…</p>}>
        <input
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          class="mt-3 w-full max-w-3xl border-0 border-b border-transparent bg-transparent text-2xl font-semibold tracking-tight outline-none focus:border-accent-300"
        />

        <div class="mt-4 grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
          <textarea
            value={body()}
            onInput={(e) => setBody(e.currentTarget.value)}
            placeholder="Escreva em markdown. [[Outra nota]] cria link."
            class="min-h-[50vh] resize-none rounded-md border border-neutral-200 bg-white p-4 font-mono text-sm outline-none focus:border-accent-400"
          />
          <div
            class="prose prose-sm min-h-[50vh] max-w-none overflow-auto rounded-md border border-neutral-200 bg-white p-4"
            innerHTML={html()}
          />
        </div>

        <div class="mt-3 flex items-center gap-3">
          <button
            onClick={save}
            class="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
          >
            Salvar
          </button>
          <button
            onClick={remove}
            class="rounded-md border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Apagar
          </button>
          <Show when={saved()}>
            <span class="text-sm text-accent-600">salvo ✓</span>
          </Show>
        </div>

        <section class="mt-8 max-w-3xl">
          <h2 class="text-sm font-medium text-neutral-700">Backlinks</h2>
          <Show
            when={(links() ?? []).length > 0}
            fallback={
              <p class="mt-2 text-sm text-neutral-400">
                Nenhuma nota aponta para esta.
              </p>
            }
          >
            <ul class="mt-2 space-y-1">
              <For each={links()}>
                {(n) => (
                  <li>
                    <A
                      href={`/notas/${n.id}`}
                      class="text-sm text-accent-700 hover:underline"
                    >
                      {n.title}
                    </A>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </section>
      </Show>
    </div>
  );
}
