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
  const [editing, setEditing] = createSignal(false);
  const [suggest, setSuggest] = createSignal<{ start: number; query: string } | null>(
    null,
  );
  let taRef: HTMLTextAreaElement | undefined;

  // detecta um `[[` aberto antes do cursor → query p/ autocomplete
  function detect(value: string, caret: number) {
    const before = value.slice(0, caret);
    const idx = before.lastIndexOf("[[");
    if (idx === -1) return null;
    const q = before.slice(idx + 2);
    if (/[\]\[\n]/.test(q)) return null;
    return { start: idx, query: q };
  }

  function onBodyInput(e: InputEvent & { currentTarget: HTMLTextAreaElement }) {
    const ta = e.currentTarget;
    setBody(ta.value);
    setSuggest(detect(ta.value, ta.selectionStart));
  }

  const candidates = () => {
    const s = suggest();
    if (!s) return [];
    const q = s.query.toLowerCase();
    return (allNotes() ?? [])
      .filter((n) => n.id !== id() && n.title.toLowerCase().includes(q))
      .slice(0, 8);
  };

  function pick(noteTitle: string) {
    const s = suggest();
    if (!s || !taRef) return;
    const caret = taRef.selectionStart;
    const next =
      body().slice(0, s.start) + `[[${noteTitle}]]` + body().slice(caret);
    setBody(next);
    setSuggest(null);
    const pos = s.start + noteTitle.length + 4;
    queueMicrotask(() => {
      taRef!.focus();
      taRef!.setSelectionRange(pos, pos);
    });
  }

  createEffect(() => {
    const n = note();
    if (n) {
      setTitle(n.title);
      setBody(n.body_md);
      // nota nova/vazia → já abre em edição
      if (!n.body_md.trim()) setEditing(true);
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
    setEditing(false);
    refetch();
    refetchLinks();
    refetchAll();
  }

  function cancel() {
    const n = note();
    if (n) {
      setTitle(n.title);
      setBody(n.body_md);
    }
    setSuggest(null);
    setEditing(false);
  }

  async function remove() {
    await deleteNote(id());
    navigate("/notas");
  }

  return (
    <div class="p-8">
      <A href="/notas" class="text-sm text-muted hover:text-accent-300">
        ← Notas
      </A>

      <Show when={note()} fallback={<p class="mt-4 text-faint">…</p>}>
        {/* ---- modo leitura ---- */}
        <Show when={!editing()}>
          <div class="flex items-start justify-between gap-4">
            <h1 class="mt-3 max-w-3xl text-2xl font-semibold tracking-tight">
              {title() || "Sem título"}
            </h1>
            <div class="mt-3 flex shrink-0 items-center gap-2">
              <button
                onClick={() => setEditing(true)}
                class="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
              >
                Editar
              </button>
              <button
                onClick={remove}
                class="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                Apagar
              </button>
            </div>
          </div>
          <div
            class="prose prose-sm prose-invert mt-4 max-w-3xl overflow-auto"
            innerHTML={html()}
          />
        </Show>

        {/* ---- modo edição ---- */}
        <Show when={editing()}>
          <input
            value={title()}
            onInput={(e) => setTitle(e.currentTarget.value)}
            class="mt-3 w-full max-w-3xl border-0 border-b border-transparent bg-transparent text-2xl font-semibold tracking-tight outline-none focus:border-accent-500/60"
          />

          <div class="mt-4 grid max-w-5xl grid-cols-1 gap-4 lg:grid-cols-2">
            <div class="relative">
              <textarea
                ref={taRef}
                value={body()}
                onInput={onBodyInput}
                onKeyDown={(e) => e.key === "Escape" && setSuggest(null)}
                placeholder="Escreva em markdown. [[Outra nota]] cria link."
                class="min-h-[50vh] w-full resize-none rounded-md border border-line bg-surface p-4 font-mono text-sm outline-none focus:border-accent-500"
              />
              <Show when={suggest() && candidates().length > 0}>
                <ul class="absolute left-4 top-4 z-20 w-64 overflow-hidden rounded-md border border-line bg-surface shadow-lg">
                  <li class="border-b border-line px-3 py-1 text-xs text-faint">
                    notas para [[link]]
                  </li>
                  <For each={candidates()}>
                    {(n) => (
                      <li>
                        <button
                          type="button"
                          onClick={() => pick(n.title)}
                          class="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent-500/10"
                        >
                          {n.title}
                        </button>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
            <div
              class="prose prose-sm prose-invert min-h-[50vh] max-w-none overflow-auto rounded-md border border-line bg-surface p-4"
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
              onClick={cancel}
              class="rounded-md border border-line px-3 py-2 text-sm text-muted hover:bg-accent-500/10"
            >
              Cancelar
            </button>
            <button
              onClick={remove}
              class="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              Apagar
            </button>
            <Show when={saved()}>
              <span class="text-sm text-accent-300">salvo ✓</span>
            </Show>
          </div>
        </Show>

        <section class="mt-8 max-w-3xl">
          <h2 class="text-sm font-medium text-ink">Backlinks</h2>
          <Show
            when={(links() ?? []).length > 0}
            fallback={
              <p class="mt-2 text-sm text-faint">
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
                      class="text-sm text-accent-300 hover:underline"
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
