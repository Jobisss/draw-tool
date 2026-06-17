import { createSignal, createResource, For, Show } from "solid-js";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  listReferences,
  addReference,
  deleteReference,
} from "../lib/refs";

export default function ReferenceList(props: { studyId: number }) {
  const [refs, { refetch }] = createResource(
    () => props.studyId,
    listReferences,
  );
  const [url, setUrl] = createSignal("");
  const [caption, setCaption] = createSignal("");

  async function add() {
    if (!url().trim()) return;
    await addReference(props.studyId, url().trim(), caption().trim() || null);
    setUrl("");
    setCaption("");
    refetch();
  }

  async function remove(id: number) {
    await deleteReference(id);
    refetch();
  }

  return (
    <section>
      <h3 class="text-xs font-semibold uppercase tracking-wide text-faint">
        Referências
      </h3>
      <ul class="mt-2 space-y-1">
        <For each={refs() ?? []}>
          {(r) => (
            <li class="flex items-center justify-between gap-2 text-sm">
              <button
                onClick={() => openUrl(r.url)}
                class="truncate text-left text-accent-300 hover:underline"
                title={r.url}
              >
                {r.caption || r.url}
              </button>
              <button
                onClick={() => remove(r.id)}
                class="shrink-0 text-faint hover:text-red-500"
              >
                ✕
              </button>
            </li>
          )}
        </For>
      </ul>
      <div class="mt-2 space-y-2">
        <input
          value={url()}
          onInput={(e) => setUrl(e.currentTarget.value)}
          placeholder="https://…"
          class="w-full rounded-md border border-line bg-surface text-ink px-2 py-1 text-sm outline-none focus:border-accent-500"
        />
        <div class="flex gap-2">
          <input
            value={caption()}
            onInput={(e) => setCaption(e.currentTarget.value)}
            placeholder="legenda (opcional)"
            class="flex-1 rounded-md border border-line bg-surface text-ink px-2 py-1 text-sm outline-none focus:border-accent-500"
          />
          <button
            onClick={add}
            class="rounded-md border border-line px-3 py-1 text-sm hover:bg-surface2"
          >
            +
          </button>
        </div>
      </div>
    </section>
  );
}
