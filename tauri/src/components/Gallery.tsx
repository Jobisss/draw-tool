import { For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Study } from "../lib/studies";

export default function Gallery(props: { studies: Study[] }) {
  return (
    <Show
      when={props.studies.length > 0}
      fallback={
        <p class="mt-8 text-sm text-neutral-400">Nenhum estudo encontrado.</p>
      }
    >
      <div class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <For each={props.studies}>
          {(s) => (
            <A
              href={`/biblioteca/${s.id}`}
              class="group overflow-hidden rounded-md border border-neutral-200 bg-white transition-shadow hover:shadow-md"
            >
              <div class="grid aspect-square place-items-center bg-neutral-100">
                <Show
                  when={s.thumb_path}
                  fallback={
                    <span class="text-3xl uppercase text-neutral-300">
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
              </div>
              <div class="p-2">
                <p class="truncate text-sm font-medium text-neutral-800">
                  {s.title ?? s.filename}
                </p>
                <p class="text-xs uppercase text-neutral-400">{s.format}</p>
              </div>
            </A>
          )}
        </For>
      </div>
    </Show>
  );
}
