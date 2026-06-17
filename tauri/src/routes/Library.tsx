import { createSignal, createResource, For, Show, createEffect, onCleanup } from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { extractPalette } from "../lib/palette";
import Gallery from "../components/Gallery";
import DropZone from "../components/DropZone";
import { listStudies, distinctFormats, RASTER } from "../lib/studies";
import { scanVault, generateMissingThumbnails } from "../lib/indexer";
import { listCollections } from "../lib/collections";

export default function Library() {
  const [search, setSearch] = createSignal("");
  const [format, setFormat] = createSignal("");
  const [collection, setCollection] = createSignal("");
  const [lightboxIndex, setLightboxIndex] = createSignal<number | null>(null);

  const [studies, { refetch }] = createResource(
    () => ({
      search: search(),
      format: format(),
      collectionId: collection() ? Number(collection()) : undefined,
    }),
    (opts) => listStudies(opts),
  );
  const [formats, { refetch: refetchFormats }] =
    createResource(distinctFormats);
  const [collections] = createResource(listCollections);

  async function onImported() {
    await scanVault();
    await generateMissingThumbnails();
    refetch();
    refetchFormats();
  }

  const currentStudy = () =>
    lightboxIndex() !== null ? (studies() ?? [])[lightboxIndex()!] : null;

  function openLightbox(studyId: number) {
    const list = studies() ?? [];
    const idx = list.findIndex((s) => s.id === studyId);
    if (idx !== -1) {
      setLightboxIndex(idx);
    }
  }

  createEffect(() => {
    const idx = lightboxIndex();
    if (idx === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const list = studies() ?? [];
      if (list.length === 0) return;
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev! + 1) % list.length);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) => (prev! - 1 + list.length) % list.length);
      } else if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "g" || e.key === "G") {
        setGrayscale((v) => !v);
      } else if (e.key === "h" || e.key === "H") {
        setFlipH((v) => !v);
      } else if (e.key === "v" || e.key === "V") {
        setFlipV((v) => !v);
      } else if (e.key === "r" || e.key === "R") {
        setShowGrid((v) => !v);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => {
      window.removeEventListener("keydown", handleKeyDown);
    });
  });

  const [zoom, setZoom] = createSignal(1);
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = createSignal(false);
  let dragStart = { x: 0, y: 0 };

  // ferramentas de visão (estudo): cinza, espelhar, grid de terços
  const [grayscale, setGrayscale] = createSignal(false);
  const [flipH, setFlipH] = createSignal(false);
  const [flipV, setFlipV] = createSignal(false);
  const [showGrid, setShowGrid] = createSignal(false);

  // paleta extraída da imagem atual
  const [palette, setPalette] = createSignal<string[] | null>(null);
  const [paletteErr, setPaletteErr] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal<string | null>(null);

  async function togglePalette(src: string) {
    if (palette() || paletteErr()) {
      setPalette(null);
      setPaletteErr(null);
      return;
    }
    try {
      setPalette(await extractPalette(src, 6));
    } catch (e) {
      setPaletteErr(String(e));
    }
  }

  async function copyHex(hex: string) {
    await navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1200);
  }
  async function copyAll() {
    const p = palette();
    if (!p) return;
    await navigator.clipboard.writeText(p.join(" "));
    setCopied("all");
    setTimeout(() => setCopied(null), 1200);
  }

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsDragging(false);
  }

  // sai do lightbox → zera ferramentas
  createEffect(() => {
    if (lightboxIndex() === null) {
      setGrayscale(false);
      setFlipH(false);
      setFlipV(false);
      setShowGrid(false);
      setPalette(null);
      setPaletteErr(null);
    }
  });

  // troca de imagem → limpa paleta (recalcula sob demanda)
  createEffect(() => {
    lightboxIndex();
    setPalette(null);
    setPaletteErr(null);
  });

  createEffect(() => {
    lightboxIndex();
    resetZoom();
  });

  createEffect(() => {
    const idx = lightboxIndex();
    if (idx === null) return;
    document.body.style.overflow = "hidden";
    onCleanup(() => {
      document.body.style.overflow = "";
    });
  });

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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

  const handleMouseDown = (e: MouseEvent) => {
    if (zoom() <= 1) return;
    setIsDragging(true);
    dragStart = { x: e.clientX - pan().x, y: e.clientY - pan().y };
    e.preventDefault();
  };

  const handleWheel = (e: WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((z) => {
      const next = Math.max(0.5, Math.min(8, z * factor));
      if (next <= 1.05 && next >= 0.95) {
        setPan({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
  };

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Biblioteca</h1>
      <p class="mt-1 text-sm text-muted">
        Estudos indexados do vault. Indexe em Configurações.
      </p>

      <div class="mt-4">
        <DropZone onImported={onImported} />
      </div>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          placeholder="Buscar por nome ou tag…"
          class="w-64 rounded-md border border-line bg-surface text-ink px-3 py-2 text-sm outline-none focus:border-accent-500"
        />
        <select
          value={format()}
          onChange={(e) => setFormat(e.currentTarget.value)}
          class="rounded-md border border-line bg-surface text-ink px-3 py-2 text-sm outline-none focus:border-accent-500"
        >
          <option value="">Todos formatos</option>
          <For each={formats() ?? []}>
            {(f) => <option value={f}>{f}</option>}
          </For>
        </select>
        <select
          value={collection()}
          onChange={(e) => setCollection(e.currentTarget.value)}
          class="rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent-500"
        >
          <option value="">Todas coleções</option>
          <For each={collections() ?? []}>
            {(c) => <option value={c.id}>{c.name}</option>}
          </For>
        </select>
        <Show when={studies()}>
          <span class="text-sm text-muted font-serif">
            {studies()!.length} estudos
          </span>
        </Show>
      </div>

      <Show
        when={!studies.loading}
        fallback={<p class="mt-6 text-sm text-faint">carregando…</p>}
      >
        <Gallery studies={studies() ?? []} onOpenLightbox={openLightbox} />
      </Show>

      {/* Lightbox overlay */}
      <Show when={lightboxIndex() !== null && currentStudy()}>
        {() => {
          const s = currentStudy()!;
          const isRaster = () => RASTER.has(s.format.toLowerCase());
          const src = () => {
            if (isRaster()) return convertFileSrc(s.path);
            if (s.thumb_path) return convertFileSrc(s.thumb_path);
            return null;
          };

          return (
            <div class="fixed inset-0 z-50 flex flex-col bg-black/95 text-ink animate-fade-in no-print">
              {/* Header */}
              <div class="flex items-center justify-between p-4 bg-surface border-b border-line shadow-md">
                <div class="truncate mr-4">
                  <h2 class="text-base font-serif font-semibold text-ink">
                    {s.title ?? s.filename}
                  </h2>
                  <p class="text-xs text-muted truncate font-mono">{s.path}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                  {/* Zoom controls */}
                  <Show when={src()}>
                    <div class="flex items-center gap-1.5 mr-2">
                      <button
                        onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                        class="rounded bg-surface2 px-2 py-0.5 text-xs border border-line hover:bg-line text-ink font-semibold"
                        title="Zoom Out"
                      >
                        -
                      </button>
                      <span class="text-xs text-muted font-mono min-w-[3rem] text-center">
                        {Math.round(zoom() * 100)}%
                      </span>
                      <button
                        onClick={() => setZoom((z) => Math.min(8, z + 0.25))}
                        class="rounded bg-surface2 px-2 py-0.5 text-xs border border-line hover:bg-line text-ink font-semibold"
                        title="Zoom In"
                      >
                        +
                      </button>
                      <Show when={zoom() !== 1 || pan().x !== 0 || pan().y !== 0}>
                        <button
                          onClick={resetZoom}
                          class="rounded bg-surface2 px-2 py-0.5 text-xs border border-line hover:bg-line text-accent-400 font-semibold"
                          title="Ajustar à tela"
                        >
                          Reset
                        </button>
                      </Show>
                    </div>
                  </Show>

                  {/* Ferramentas de visão */}
                  <div class="flex items-center gap-1.5 mr-2">
                    <button
                      onClick={() => setGrayscale((v) => !v)}
                      classList={{
                        "bg-accent-500 text-white border-accent-500": grayscale(),
                        "bg-surface2 text-ink border-line hover:bg-line": !grayscale(),
                      }}
                      class="rounded px-2 py-0.5 text-xs border font-semibold"
                      title="Escala de cinza (checar valores)"
                    >
                      Cinza
                    </button>
                    <button
                      onClick={() => setFlipH((v) => !v)}
                      classList={{
                        "bg-accent-500 text-white border-accent-500": flipH(),
                        "bg-surface2 text-ink border-line hover:bg-line": !flipH(),
                      }}
                      class="rounded px-2 py-0.5 text-xs border font-semibold"
                      title="Espelhar horizontal (checar proporção)"
                    >
                      ⇆
                    </button>
                    <button
                      onClick={() => setFlipV((v) => !v)}
                      classList={{
                        "bg-accent-500 text-white border-accent-500": flipV(),
                        "bg-surface2 text-ink border-line hover:bg-line": !flipV(),
                      }}
                      class="rounded px-2 py-0.5 text-xs border font-semibold"
                      title="Espelhar vertical"
                    >
                      ⇅
                    </button>
                    <button
                      onClick={() => setShowGrid((v) => !v)}
                      classList={{
                        "bg-accent-500 text-white border-accent-500": showGrid(),
                        "bg-surface2 text-ink border-line hover:bg-line": !showGrid(),
                      }}
                      class="rounded px-2 py-0.5 text-xs border font-semibold"
                      title="Grid de terços (composição/proporção)"
                    >
                      Grid
                    </button>
                    <Show when={src()}>
                      <button
                        onClick={() => togglePalette(src()!)}
                        classList={{
                          "bg-accent-500 text-white border-accent-500":
                            !!palette() || !!paletteErr(),
                          "bg-surface2 text-ink border-line hover:bg-line":
                            !palette() && !paletteErr(),
                        }}
                        class="rounded px-2 py-0.5 text-xs border font-semibold"
                        title="Extrair paleta de cores"
                      >
                        Paleta
                      </button>
                    </Show>
                    <button
                      onClick={() => openPath(s.path)}
                      class="rounded px-2 py-0.5 text-xs border border-line bg-surface2 text-ink hover:bg-line font-semibold"
                      title="Abrir no app externo (Clip Studio para .clip)"
                    >
                      Abrir ↗
                    </button>
                  </div>

                  <span class="text-xs text-muted font-mono bg-surface2 px-2.5 py-1 rounded border border-line">
                    {lightboxIndex()! + 1} / {studies()?.length ?? 0}
                  </span>
                  <button
                    onClick={() => setLightboxIndex(null)}
                    class="rounded-full bg-surface2 p-2 hover:bg-line text-ink hover:text-red-400 transition-colors border border-line"
                    title="Fechar (Esc)"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div 
                onWheel={handleWheel}
                class="flex-1 relative flex items-center justify-center p-4 overflow-hidden"
              >
                {/* Left Navigation */}
                <button
                  onClick={() =>
                    setLightboxIndex(
                      (prev) => (prev! - 1 + studies()!.length) % studies()!.length,
                    )
                  }
                  class="absolute left-4 z-10 rounded-full bg-surface/70 p-3 hover:bg-accent-500 hover:text-white transition-colors border border-line text-ink"
                  title="Anterior (←)"
                >
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Main View */}
                <Show
                  when={src()}
                  fallback={
                    <div class="flex flex-col items-center justify-center border border-dashed border-line bg-surface rounded-lg p-12 max-w-sm">
                      <span class="text-5xl uppercase text-faint font-bold tracking-wider">
                        {s.format}
                      </span>
                      <p class="mt-4 text-xs text-muted text-center">
                        Visualização direta indisponível.
                      </p>
                    </div>
                  }
                >
                  <div
                    onMouseDown={handleMouseDown}
                    onDblClick={() => {
                      if (zoom() > 1) {
                        resetZoom();
                      } else {
                        setZoom(2.5);
                      }
                    }}
                    class="relative inline-block select-none"
                    style={{
                      transform: `translate(${pan().x}px, ${pan().y}px) scale(${
                        zoom() * (flipH() ? -1 : 1)
                      }, ${zoom() * (flipV() ? -1 : 1)})`,
                      cursor: zoom() > 1 ? (isDragging() ? "grabbing" : "grab") : "zoom-in",
                      "transform-origin": "center",
                      transition: isDragging() ? "none" : "transform 0.15s ease-out",
                    }}
                  >
                    <img
                      src={src()!}
                      alt={s.title ?? s.filename}
                      class="block max-w-full max-h-[75vh] object-contain shadow-2xl rounded"
                      style={{ filter: grayscale() ? "grayscale(1)" : "none" }}
                    />
                    <Show when={showGrid()}>
                      <div
                        class="pointer-events-none absolute inset-0 rounded"
                        style={{
                          "background-image":
                            "linear-gradient(to right, rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px)",
                          "background-size": "33.333% 33.333%",
                          "mix-blend-mode": "difference",
                        }}
                      />
                    </Show>
                  </div>
                </Show>

                {/* Right Navigation */}
                <button
                  onClick={() =>
                    setLightboxIndex((prev) => (prev! + 1) % studies()!.length)
                  }
                  class="absolute right-4 z-10 rounded-full bg-surface/70 p-3 hover:bg-accent-500 hover:text-white transition-colors border border-line text-ink"
                  title="Próximo (→)"
                >
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Painel de paleta */}
                <Show when={palette() || paletteErr()}>
                  <div class="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-line bg-surface/95 p-3 shadow-xl backdrop-blur">
                    <Show
                      when={palette()}
                      fallback={
                        <p class="text-xs text-red-300">
                          Não deu pra extrair: {paletteErr()}
                        </p>
                      }
                    >
                      <div class="flex items-center gap-2">
                        <For each={palette()!}>
                          {(hex) => (
                            <button
                              onClick={() => copyHex(hex)}
                              class="group flex flex-col items-center gap-1"
                              title={`Copiar ${hex}`}
                            >
                              <span
                                class="h-9 w-9 rounded border border-line shadow-sm transition-transform group-hover:scale-110"
                                style={{ "background-color": hex }}
                              />
                              <span class="font-mono text-[10px] text-muted">
                                {copied() === hex ? "copiado!" : hex}
                              </span>
                            </button>
                          )}
                        </For>
                        <button
                          onClick={copyAll}
                          class="ml-1 self-start rounded border border-line bg-surface2 px-2 py-1 text-xs text-ink hover:bg-line"
                          title="Copiar todos os hex"
                        >
                          {copied() === "all" ? "✓" : "Copiar tudo"}
                        </button>
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>

              {/* Footer navigation guide */}
              <div class="p-3 text-center bg-surface border-t border-line text-[11px] text-muted font-mono">
                Girar <span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">Scroll</span> / <span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">Dois Cliques</span> para Zoom · Teclas <span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">←</span> e <span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">→</span> para navegar · <span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">Esc</span> fechar · <span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">G</span> cinza · <span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">H</span>/<span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">V</span> espelhar · <span class="border border-line px-1 py-0.5 rounded bg-surface2 text-ink font-semibold">R</span> grid
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
}
