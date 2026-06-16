import {
  createResource,
  createSignal,
  createEffect,
  For,
  Show,
} from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { confirm } from "@tauri-apps/plugin-dialog";
import MarkdownIt from "markdown-it";
import { getStudy, setStudyDate, deleteStudy, RASTER } from "../lib/studies";
import { readTextFile, deleteFile } from "../lib/api";
import { getSetting, VAULT_PATH_KEY } from "../lib/settings";
import {
  tagsForStudy,
  addTagToStudy,
  removeTagFromStudy,
  TAG_CATEGORIES,
} from "../lib/tags";
import {
  listCollections,
  collectionsForStudy,
  addToCollection,
  removeFromCollection,
  createCollection,
} from "../lib/collections";
import ImageAnnotator from "../components/ImageAnnotator";
import ReferenceList from "../components/ReferenceList";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

function human(bytes: number | null): string {
  if (!bytes) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let n = bytes,
    i = 0;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

export default function StudyDetail() {
  const params = useParams();
  const navigate = useNavigate();
  const [study] = createResource(() => Number(params.id), getStudy);

  async function removeStudy(path: string, id: number) {
    const ok = await confirm(
      `Apagar este estudo?\n\n⚠️ O arquivo será apagado PERMANENTEMENTE do vault:\n${path}`,
      { title: "Apagar estudo", kind: "warning", okLabel: "Apagar" },
    );
    if (!ok) return;
    // remove do índice primeiro (é o que importa); arquivo é best-effort
    await deleteStudy(id);
    try {
      const vault = await getSetting(VAULT_PATH_KEY);
      if (vault) await deleteFile(vault, path);
    } catch (e) {
      console.error("falha ao apagar o arquivo (pode estar em uso):", e);
    }
    navigate("/biblioteca");
  }

  const isMd = () => study()?.format === "md";
  const [mdText] = createResource(
    () => (isMd() ? study()!.path : false),
    readTextFile,
  );

  const src = () => {
    const s = study();
    if (!s) return null;
    if (RASTER.has(s.format)) return convertFileSrc(s.path);
    if (s.thumb_path) return convertFileSrc(s.thumb_path);
    return null;
  };

  return (
    <div class="p-8">
      <A href="/biblioteca" class="text-sm text-muted hover:text-accent-300">
        ← Biblioteca
      </A>
      <Show when={study()} fallback={<p class="mt-4 text-faint">…</p>}>
        {(s) => (
          <div class="mt-3 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <Show
              when={!isMd()}
              fallback={
                <div
                  class="prose prose-sm prose-invert max-w-none rounded-md border border-line bg-surface p-6"
                  innerHTML={md.render(mdText() ?? "")}
                />
              }
            >
              <div class="grid min-h-[300px] place-items-center rounded-md border border-line bg-surface2 p-4">
                <Show
                  when={src()}
                  fallback={
                    <span class="text-5xl uppercase text-faint">
                      {s().format}
                    </span>
                  }
                >
                  <ImageAnnotator
                    studyId={s().id}
                    src={src()!}
                    alt={s().title ?? s().filename}
                  />
                </Show>
              </div>
            </Show>

            <div>
              <h1 class="text-xl font-semibold tracking-tight">
                {s().title ?? s().filename}
              </h1>
              <dl class="mt-4 space-y-2 text-sm">
                <Meta label="Arquivo" value={s().filename} />
                <Meta label="Formato" value={s().format.toUpperCase()} />
                <Meta label="Tamanho" value={human(s().size_bytes)} />
                <Meta
                  label="Criado"
                  value={s().created_at?.slice(0, 10) ?? "—"}
                />
                <Meta label="Caminho" value={s().path} mono />
              </dl>
              <div class="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => openPath(s().path)}
                  class="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
                >
                  Abrir no app padrão
                </button>
                <button
                  type="button"
                  onClick={() => removeStudy(s().path, s().id)}
                  class="rounded-md border border-red-500/40 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Apagar
                </button>
              </div>

              <StudyEditors studyId={s().id} />
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

function StudyEditors(props: { studyId: number }) {
  const [tags, { refetch: refetchTags }] = createResource(
    () => props.studyId,
    tagsForStudy,
  );
  const [allCols, { refetch: refetchAllCols }] = createResource(listCollections);
  const [studyCols, { refetch: refetchStudyCols }] = createResource(
    () => props.studyId,
    collectionsForStudy,
  );
  const [study, { refetch: refetchStudy }] = createResource(
    () => props.studyId,
    getStudy,
  );

  const [tagName, setTagName] = createSignal("");
  const [tagCat, setTagCat] = createSignal(TAG_CATEGORIES[0]);
  const [colSel, setColSel] = createSignal<string>("");
  const [newCol, setNewCol] = createSignal("");
  const [date, setDate] = createSignal("");

  // semeia a data quando o estudo carrega
  createEffect(() => {
    const s = study();
    if (s) setDate(s.created_at?.slice(0, 10) ?? "");
  });

  async function saveDate(value: string) {
    setDate(value);
    await setStudyDate(props.studyId, value || null);
    refetchStudy();
  }

  async function addTag() {
    if (!tagName().trim()) return;
    await addTagToStudy(props.studyId, tagName().trim(), tagCat());
    setTagName("");
    refetchTags();
  }
  async function rmTag(id: number) {
    await removeTagFromStudy(props.studyId, id);
    refetchTags();
  }

  async function addCol() {
    if (!colSel()) return;
    await addToCollection(Number(colSel()), props.studyId);
    setColSel("");
    refetchStudyCols();
  }
  async function addNewCol() {
    const name = newCol().trim();
    if (!name) return;
    const id = await createCollection(name);
    await addToCollection(id, props.studyId);
    setNewCol("");
    refetchAllCols();
    refetchStudyCols();
  }
  async function rmCol(id: number) {
    await removeFromCollection(id, props.studyId);
    refetchStudyCols();
  }

  const inCol = (id: number) => studyCols()?.some((c) => c.id === id);

  return (
    <div class="mt-6 space-y-5 border-t border-line pt-5">
      {/* Data do estudo */}
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-faint">
          Data do estudo
        </h3>
        <input
          type="date"
          value={date()}
          onChange={(e) => saveDate(e.currentTarget.value)}
          class="mt-2 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-accent-500"
        />
        <p class="mt-1 text-xs text-faint">
          Usada na Timeline e no Painel. Padrão = data do arquivo.
        </p>
      </section>

      {/* Tags */}
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-faint">
          Tags
        </h3>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <For each={tags() ?? []}>
            {(t) => (
              <span class="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2 py-0.5 text-xs text-accent-300">
                {t.category ? `${t.category}: ` : ""}
                {t.name}
                <button onClick={() => rmTag(t.id)} class="hover:text-red-500">
                  ✕
                </button>
              </span>
            )}
          </For>
        </div>
        <div class="mt-2 flex gap-2">
          <input
            value={tagName()}
            onInput={(e) => setTagName(e.currentTarget.value)}
            placeholder="nome da tag"
            class="flex-1 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-accent-500"
          />
          <select
            value={tagCat()}
            onChange={(e) => setTagCat(e.currentTarget.value)}
            class="rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-accent-500"
          >
            <For each={TAG_CATEGORIES}>{(c) => <option value={c}>{c}</option>}</For>
          </select>
          <button
            onClick={addTag}
            class="rounded-md border border-line px-3 py-1 text-sm hover:bg-surface2"
          >
            +
          </button>
        </div>
      </section>

      {/* Coleções */}
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-faint">
          Coleções
        </h3>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <For each={studyCols() ?? []}>
            {(c) => (
              <span class="inline-flex items-center gap-1 rounded-full bg-surface2 px-2 py-0.5 text-xs text-ink">
                {c.name}
                <button onClick={() => rmCol(c.id)} class="hover:text-red-500">
                  ✕
                </button>
              </span>
            )}
          </For>
        </div>
        <div class="mt-2 flex gap-2">
          <select
            value={colSel()}
            onChange={(e) => setColSel(e.currentTarget.value)}
            class="flex-1 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-accent-500"
          >
            <option value="">adicionar a coleção…</option>
            <For each={(allCols() ?? []).filter((c) => !inCol(c.id))}>
              {(c) => <option value={c.id}>{c.name}</option>}
            </For>
          </select>
          <button
            onClick={addCol}
            class="rounded-md border border-line px-3 py-1 text-sm hover:bg-surface2"
          >
            +
          </button>
        </div>
        <div class="mt-2 flex gap-2">
          <input
            value={newCol()}
            onInput={(e) => setNewCol(e.currentTarget.value)}
            placeholder="nova coleção"
            class="flex-1 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-accent-500"
          />
          <button
            onClick={addNewCol}
            class="rounded-md border border-line px-3 py-1 text-sm hover:bg-surface2"
          >
            criar
          </button>
        </div>
      </section>

      <ReferenceList studyId={props.studyId} />
    </div>
  );
}

function Meta(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt class="text-xs uppercase tracking-wide text-faint">
        {props.label}
      </dt>
      <dd
        class="break-words text-ink"
        classList={{ "font-mono text-xs": props.mono }}
      >
        {props.value}
      </dd>
    </div>
  );
}
