import { createSignal, createResource, For, Show, createEffect, onCleanup } from "solid-js";
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

  const [zoom, setZoom] = createSignal(1);
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = createSignal(false);
  let dragStart = { x: 0, y: 0 };
  let startX = 0;
  let startY = 0;
  let dragDistance = 0;
  let ignoreNextClick = false;

  function onImgClick(e: MouseEvent) {
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
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

  const handleMouseDown = (e: MouseEvent) => {
    startX = e.clientX;
    startY = e.clientY;
    dragDistance = 0;

    if (zoom() > 1) {
      setIsDragging(true);
      dragStart = { x: e.clientX - pan().x, y: e.clientY - pan().y };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging()) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      dragDistance = Math.sqrt(dx * dx + dy * dy);
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (isDragging()) {
      setIsDragging(false);
      if (dragDistance > 5) {
        ignoreNextClick = true;
        e.stopPropagation();
        e.preventDefault();
      }
    }
  };

  createEffect(() => {
    if (!isDragging()) return;
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    onCleanup(() => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    });
  });

  const handleWheel = (e: WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    let nextZoom = 1;
    setZoom((z) => {
      const next = Math.max(1, Math.min(8, z * factor));
      nextZoom = next;
      if (next <= 1.05) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
    if (nextZoom > 1 || zoom() > 1) {
      e.preventDefault();
    }
  };

  const handleDblClick = (e: MouseEvent) => {
    if (zoom() > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
    e.preventDefault();
  };

  const cursorClass = () => {
    if (zoom() > 1) {
      return isDragging() ? "cursor-grabbing" : "cursor-grab";
    }
    return "cursor-crosshair";
  };

  return (
    <div class="relative inline-block max-w-full">
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDblClick={handleDblClick}
        class="relative inline-block max-w-full"
        style={{
          transform: `translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`,
          "transform-origin": "center",
          transition: isDragging() ? "none" : "transform 0.15s ease-out",
        }}
      >
        <img
          src={props.src}
          alt={props.alt}
          onClick={onImgClick}
          class={`max-h-[70vh] max-w-full rounded object-contain select-none ${cursorClass()}`}
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
                class="w-32 rounded border border-line bg-surface2 text-ink px-1 py-0.5 text-xs outline-none"
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

      {/* Floating Zoom Indicator Outside Transformed Container */}
      <Show when={zoom() > 1}>
        <div class="absolute top-2 left-2 z-30 rounded bg-black/75 px-2 py-1 text-[10px] font-mono text-white select-none border border-neutral-700/50 flex items-center gap-2">
          <span>{Math.round(zoom() * 100)}%</span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            class="hover:text-accent-400 font-semibold"
          >
            Reset
          </button>
        </div>
      </Show>
    </div>
  );
}
