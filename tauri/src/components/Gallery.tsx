import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Study } from "../lib/studies";
import PdfThumb from "./PdfThumb";

export default function Gallery(props: {
  studies: Study[];
  onOpenLightbox?: (id: number) => void;
}) {
  return (
    <Show
      when={props.studies.length > 0}
      fallback={
        <p class="mt-8 text-sm text-faint">Nenhum estudo encontrado.</p>
      }
    >
      <div class="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        <For each={props.studies}>
          {(s) => (
            <div class="group relative overflow-hidden rounded-md border border-line bg-surface transition-shadow hover:shadow-md">
              <A href={`/biblioteca/${s.id}`} class="block">
                <div class="grid aspect-square place-items-center bg-surface2">
                  <Show
                    when={!(s.format === "pdf" && !s.thumb_path)}
                    fallback={<PdfThumb path={s.path} />}
                  >
                    <Show
                      when={s.thumb_path}
                      fallback={
                        <span class="text-xl uppercase text-faint font-semibold">
                          {s.format}
                        </span>
                      }
                    >
                      <img
                        src={convertFileSrc(s.thumb_path!)}
                        alt={s.title ?? s.filename}
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </Show>
                  </Show>
                </div>
                <div class="p-1.5">
                  <p class="truncate text-xs font-medium text-ink">
                    {s.title ?? s.filename}
                  </p>
                  <p class="text-[9px] uppercase tracking-wider text-faint">
                    {s.format}
                  </p>
                </div>
              </A>

              {/* Lightbox button option */}
              <Show when={props.onOpenLightbox}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onOpenLightbox!(s.id);
                  }}
                  title="Visualizar em Lightbox"
                  class="absolute top-1.5 right-1.5 rounded bg-surface p-1 text-ink opacity-0 transition-opacity border border-line hover:border-accent-500 hover:text-accent-400 group-hover:opacity-100"
                >
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}
