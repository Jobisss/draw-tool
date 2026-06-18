import { convertFileSrc } from "@tauri-apps/api/core";

/**
 * Visualizador de PDF usando o leitor nativo do WebView2 (Edge/PDFium) via <iframe>.
 * Mostra todas as páginas com scroll/zoom nativo, sem render na main thread (não trava).
 */
export default function PdfViewer(props: { path: string; class?: string }) {
  return (
    <iframe
      src={convertFileSrc(props.path)}
      title="PDF"
      class={
        props.class ??
        "h-[80vh] w-full rounded-md border border-line bg-surface2"
      }
    />
  );
}
