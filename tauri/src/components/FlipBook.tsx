import { onMount, onCleanup, createSignal, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import { PageFlip } from "page-flip";
import type { Study } from "../lib/studies";
import { RASTER } from "../lib/studies";

function imgSrc(s: Study): string | null {
  if (s.thumb_path) return convertFileSrc(s.thumb_path);
  if (RASTER.has(s.format)) return convertFileSrc(s.path);
  return null;
}

function dateLabel(s: Study): string {
  return s.created_at?.slice(0, 10) ?? "";
}

/**
 * Visualização "livro": folheia os estudos em ordem cronológica (evolução),
 * com virada de página realista (lib page-flip).
 */
export default function FlipBook(props: { studies: Study[] }) {
  let host: HTMLDivElement | undefined;
  let pagesRoot: HTMLDivElement | undefined;
  let flip: PageFlip | null = null;
  const navigate = useNavigate();
  const [page, setPage] = createSignal(0);
  const [count, setCount] = createSignal(0);

  onMount(() => {
    if (!host) return;
    flip = new PageFlip(host, {
      width: 420,
      height: 560,
      size: "stretch",
      minWidth: 280,
      maxWidth: 700,
      minHeight: 360,
      maxHeight: 900,
      maxShadowOpacity: 0.5,
      showCover: true,
      drawShadow: true,
      flippingTime: 700,
      usePortrait: true,
      mobileScrollSupport: false,
    });
    flip.loadFromHTML(
      (pagesRoot ?? host).querySelectorAll<HTMLElement>(".page"),
    );
    setCount(flip.getPageCount());
    flip.on("flip", (e) => setPage(e.data as number));

    onCleanup(() => {
      flip?.destroy();
      flip = null;
    });
  });

  const prev = () => flip?.flipPrev();
  const next = () => flip?.flipNext();

  return (
    <div class="flex flex-col items-center gap-4">
      <div ref={host} class="mx-auto w-full max-w-[760px] select-none" />

      <div class="flex items-center gap-3 text-sm">
        <button
          onClick={prev}
          class="rounded-md border border-line px-3 py-1 text-ink hover:bg-surface2"
        >
          ← Anterior
        </button>
        <span class="font-mono text-muted">
          {Math.min(page() + 1, count())} / {count()}
        </span>
        <button
          onClick={next}
          class="rounded-md border border-line px-3 py-1 text-ink hover:bg-surface2"
        >
          Próxima →
        </button>
      </div>

      {/* Páginas (consumidas por loadFromHTML) */}
      <div ref={pagesRoot} class="hidden">
        {/* capa */}
        <div class="page page-cover">
          <div class="flex h-full flex-col items-center justify-center gap-3 bg-surface2 p-8 text-center">
            <span class="font-serif text-3xl font-bold text-ink">Evolução</span>
            <span class="text-sm text-muted">
              {props.studies.length} estudos · do mais antigo ao mais recente
            </span>
          </div>
        </div>

        <For each={props.studies}>
          {(s) => {
            const url = imgSrc(s);
            return (
              <div class="page">
                <div
                  class="flex h-full w-full cursor-pointer flex-col bg-surface"
                  onClick={() => navigate(`/biblioteca/${s.id}`)}
                >
                  <div class="grid flex-1 place-items-center overflow-hidden bg-surface2 p-2">
                    <Show
                      when={url}
                      fallback={
                        <span class="text-2xl font-semibold uppercase text-faint">
                          {s.format}
                        </span>
                      }
                    >
                      <img
                        src={url!}
                        alt={s.title ?? s.filename}
                        class="max-h-full max-w-full object-contain"
                      />
                    </Show>
                  </div>
                  <div class="border-t border-line px-3 py-2">
                    <p class="truncate text-sm font-medium text-ink">
                      {s.title ?? s.filename}
                    </p>
                    <p class="text-xs text-faint">{dateLabel(s)}</p>
                  </div>
                </div>
              </div>
            );
          }}
        </For>

        {/* contracapa */}
        <div class="page page-cover">
          <div class="flex h-full items-center justify-center bg-surface2 p-8">
            <span class="font-serif text-xl text-muted">Fim</span>
          </div>
        </div>
      </div>
    </div>
  );
}
