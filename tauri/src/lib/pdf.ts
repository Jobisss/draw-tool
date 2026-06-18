// Carregamento de PDFs via pdf.js (render página → canvas). Sem dependência nativa.
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";

// Worker dedicado e real (módulo) — evita "fake worker" rodando parse na main thread.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Abre um PDF do vault (caminho absoluto) e devolve o documento pdf.js. */
export async function openPdf(path: string): Promise<PDFDocumentProxy> {
  const url = convertFileSrc(path);
  return await pdfjs.getDocument({ url }).promise;
}

/**
 * Inicia o render de uma página num canvas (escala p/ caber em `maxWidth`).
 * Retorna a RenderTask — o chamador deve `cancel()` antes de iniciar outro
 * render no MESMO canvas (pdf.js quebra/trava se houver render concorrente).
 */
// Teto de pixels do canvas — pdf.js pinta na main thread; páginas enormes travam a UI.
const MAX_CANVAS_PX = 2200; // maior dimensão (largura ou altura)

export async function startRender(
  doc: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
): Promise<{ task: RenderTask; page: PDFPageProxy }> {
  const page = await doc.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  let scale = Math.max(0.1, maxWidth / base.width);
  // limita a maior dimensão p/ não estourar custo de pintura
  const biggest = Math.max(base.width, base.height) * scale;
  if (biggest > MAX_CANVAS_PX) scale *= MAX_CANVAS_PX / biggest;
  const viewport = page.getViewport({ scale });
  const ctx = canvas.getContext("2d")!;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const task = page.render({ canvasContext: ctx, viewport });
  return { task, page };
}

/** Render simples (1 página), aguardando concluir + liberando a página. P/ thumbnails. */
export async function renderPage(
  doc: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  maxWidth: number,
): Promise<void> {
  const { task, page } = await startRender(doc, pageNum, canvas, maxWidth);
  await task.promise;
  page.cleanup();
}

/** True se a exceção é o cancelamento esperado de um render. */
export function isCancel(e: unknown): boolean {
  return (e as { name?: string })?.name === "RenderingCancelledException";
}
