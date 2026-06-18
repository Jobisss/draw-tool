import { onMount, onCleanup, createSignal, Show } from "solid-js";
import { openPdf, renderPage } from "../lib/pdf";

/** Thumbnail da 1ª página de um PDF (render lazy via IntersectionObserver). */
export default function PdfThumb(props: { path: string }) {
  let canvas: HTMLCanvasElement | undefined;
  let wrap: HTMLDivElement | undefined;
  const [failed, setFailed] = createSignal(false);
  const [done, setDone] = createSignal(false);

  onMount(() => {
    if (!wrap) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect();
          render();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(wrap);
    onCleanup(() => io.disconnect());
  });

  async function render() {
    try {
      const doc = await openPdf(props.path);
      await renderPage(doc, 1, canvas!, 400);
      doc.destroy();
      setDone(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div ref={wrap} class="grid aspect-square w-full place-items-center bg-surface2">
      <Show
        when={!failed()}
        fallback={<span class="text-xl font-semibold uppercase text-faint">PDF</span>}
      >
        <canvas
          ref={canvas}
          class="h-full w-full object-cover"
          classList={{ "opacity-0": !done() }}
        />
      </Show>
    </div>
  );
}
