import { createSignal, createResource, For, Show } from "solid-js";
import {
  listAnnotations,
  addAnnotation,
  deleteAnnotation,
} from "../lib/refs";

export default function ImageAnnotator(props: {
  studyId: number;
  src: string;
  alt: string;
}) {
  const [anns, { refetch }] = createResource(
    () => props.studyId,
    listAnnotations,
  );
  const [pending, setPending] = createSignal<{ x: number; y: number } | null>(
    null,
  );
  const [text, setText] = createSignal("");
  const [openId, setOpenId] = createSignal<number | null>(null);

  function onImgClick(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPending({ x, y });
    setText("");
  }

  async function confirm() {
    const p = pending();
    if (!p || !text().trim()) {
      setPending(null);
      return;
    }
    await addAnnotation(props.studyId, p.x, p.y, text().trim());
    setPending(null);
    setText("");
    refetch();
  }

  async function remove(id: number) {
    await deleteAnnotation(id);
    setOpenId(null);
    refetch();
  }

  return (
    <div class="relative inline-block">
      <img
        src={props.src}
        alt={props.alt}
        onClick={onImgClick}
        class="max-h-[70vh] max-w-full cursor-crosshair rounded object-contain"
      />

      {/* pins existentes */}
      <For each={anns() ?? []}>
        {(a) => (
          <div
            class="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${a.x}%`, top: `${a.y}%` }}
          >
            <button
              type="button"
              onClick={() => setOpenId(openId() === a.id ? null : a.id)}
              class="grid h-5 w-5 place-items-center rounded-full bg-accent-500 text-xs text-white ring-2 ring-white"
            >
              •
            </button>
            <Show when={openId() === a.id}>
              <div class="absolute left-6 top-0 z-10 w-48 rounded-md border border-line bg-surface p-2 text-xs shadow">
                <p class="text-ink">{a.text}</p>
                <button
                  onClick={() => remove(a.id)}
                  class="mt-1 text-red-500 hover:underline"
                >
                  remover
                </button>
              </div>
            </Show>
          </div>
        )}
      </For>

      {/* pin pendente (novo) */}
      <Show when={pending()}>
        <div
          class="absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pending()!.x}%`, top: `${pending()!.y}%` }}
        >
          <div class="flex items-center gap-1 rounded-md border border-accent-500/60 bg-surface p-1 shadow">
            <input
              autofocus
              value={text()}
              onInput={(e) => setText(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              placeholder="anotação"
              class="w-32 rounded border border-line px-1 py-0.5 text-xs outline-none"
            />
            <button
              onClick={confirm}
              class="rounded bg-accent-500 px-2 py-0.5 text-xs text-white"
            >
              ok
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
