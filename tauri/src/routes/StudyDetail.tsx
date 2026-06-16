import {
  createResource,
  createSignal,
  createEffect,
  For,
  Show,
} from "solid-js";
import { useParams, A } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import MarkdownIt from "markdown-it";
import { getStudy, setStudyDate, RASTER } from "../lib/studies";
import { readTextFile } from "../lib/api";
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
import { listCourses, createCourse, setStudyCourse } from "../lib/courses";
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
  const [study] = createResource(() => Number(params.id), getStudy);

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
      <A href="/biblioteca" class="text-sm text-neutral-500 hover:text-accent-700">
        ← Biblioteca
      </A>
      <Show when={study()} fallback={<p class="mt-4 text-neutral-400">…</p>}>
        {(s) => (
          <div class="mt-3 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
            <Show
              when={!isMd()}
              fallback={
                <div
                  class="prose prose-sm max-w-none rounded-md border border-neutral-200 bg-white p-6"
                  innerHTML={md.render(mdText() ?? "")}
                />
              }
            >
              <div class="grid min-h-[300px] place-items-center rounded-md border border-neutral-200 bg-neutral-100 p-4">
                <Show
                  when={src()}
                  fallback={
                    <span class="text-5xl uppercase text-neutral-300">
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
              <button
                type="button"
                onClick={() => openPath(s().path)}
                class="mt-5 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
              >
                Abrir no app padrão
              </button>

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
  const [courses, { refetch: refetchCourses }] = createResource(listCourses);
  const [study, { refetch: refetchStudy }] = createResource(
    () => props.studyId,
    getStudy,
  );

  const [tagName, setTagName] = createSignal("");
  const [tagCat, setTagCat] = createSignal(TAG_CATEGORIES[0]);
  const [colSel, setColSel] = createSignal<string>("");
  const [newCol, setNewCol] = createSignal("");
  const [courseId, setCourseId] = createSignal<string>("");
  const [lesson, setLesson] = createSignal("");
  const [newCourse, setNewCourse] = createSignal("");
  const [date, setDate] = createSignal("");

  // semeia curso/lição/data quando o estudo carrega
  createEffect(() => {
    const s = study();
    if (s) {
      setCourseId(s.course_id != null ? String(s.course_id) : "");
      setLesson(s.lesson ?? "");
      setDate(s.created_at?.slice(0, 10) ?? "");
    }
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

  async function saveCourse() {
    await setStudyCourse(
      props.studyId,
      courseId() ? Number(courseId()) : null,
      lesson().trim() || null,
    );
    refetchStudy();
  }
  async function addNewCourse() {
    const name = newCourse().trim();
    if (!name) return;
    const id = await createCourse(name);
    setNewCourse("");
    await refetchCourses();
    setCourseId(String(id));
  }

  const inCol = (id: number) => studyCols()?.some((c) => c.id === id);

  return (
    <div class="mt-6 space-y-5 border-t border-neutral-200 pt-5">
      {/* Data do estudo */}
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Data do estudo
        </h3>
        <input
          type="date"
          value={date()}
          onChange={(e) => saveDate(e.currentTarget.value)}
          class="mt-2 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
        />
        <p class="mt-1 text-xs text-neutral-400">
          Usada na Timeline e no Painel. Padrão = data do arquivo.
        </p>
      </section>

      {/* Tags */}
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Tags
        </h3>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <For each={tags() ?? []}>
            {(t) => (
              <span class="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs text-accent-700">
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
            class="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
          />
          <select
            value={tagCat()}
            onChange={(e) => setTagCat(e.currentTarget.value)}
            class="rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
          >
            <For each={TAG_CATEGORIES}>{(c) => <option value={c}>{c}</option>}</For>
          </select>
          <button
            onClick={addTag}
            class="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
          >
            +
          </button>
        </div>
      </section>

      {/* Coleções */}
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Coleções
        </h3>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <For each={studyCols() ?? []}>
            {(c) => (
              <span class="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
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
            class="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
          >
            <option value="">adicionar a coleção…</option>
            <For each={(allCols() ?? []).filter((c) => !inCol(c.id))}>
              {(c) => <option value={c.id}>{c.name}</option>}
            </For>
          </select>
          <button
            onClick={addCol}
            class="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
          >
            +
          </button>
        </div>
        <div class="mt-2 flex gap-2">
          <input
            value={newCol()}
            onInput={(e) => setNewCol(e.currentTarget.value)}
            placeholder="nova coleção"
            class="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
          />
          <button
            onClick={addNewCol}
            class="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
          >
            criar
          </button>
        </div>
      </section>

      {/* Curso / lição */}
      <section>
        <h3 class="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Curso
        </h3>
        <div class="mt-2 flex gap-2">
          <select
            value={courseId()}
            onChange={(e) => setCourseId(e.currentTarget.value)}
            class="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
          >
            <option value="">— sem curso —</option>
            <For each={courses() ?? []}>
              {(c) => <option value={c.id}>{c.name}</option>}
            </For>
          </select>
          <input
            value={lesson()}
            onInput={(e) => setLesson(e.currentTarget.value)}
            placeholder="lição"
            class="w-24 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
          />
          <button
            onClick={saveCourse}
            class="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
          >
            salvar
          </button>
        </div>
        <div class="mt-2 flex gap-2">
          <input
            value={newCourse()}
            onInput={(e) => setNewCourse(e.currentTarget.value)}
            placeholder="novo curso"
            class="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400"
          />
          <button
            onClick={addNewCourse}
            class="rounded-md border border-neutral-300 px-3 py-1 text-sm hover:bg-neutral-100"
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
      <dt class="text-xs uppercase tracking-wide text-neutral-400">
        {props.label}
      </dt>
      <dd
        class="break-words text-neutral-700"
        classList={{ "font-mono text-xs": props.mono }}
      >
        {props.value}
      </dd>
    </div>
  );
}
