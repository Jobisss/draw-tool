import {
  createSignal,
  createResource,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { convertFileSrc } from "@tauri-apps/api/core";
import { randomStudies } from "../lib/practice";
import { listTags } from "../lib/tags";
import type { Study } from "../lib/studies";

const DURATIONS = [
  { label: "30s", sec: 30 },
  { label: "1min", sec: 60 },
  { label: "2min", sec: 120 },
  { label: "5min", sec: 300 },
];

export default function Practice() {
  const [tags] = createResource(listTags);

  const [tech, setTech] = createSignal("");
  const [count, setCount] = createSignal(10);
  const [dur, setDur] = createSignal(60);

  const [deck, setDeck] = createSignal<Study[]>([]);
  const [idx, setIdx] = createSignal(0);
  const [remaining, setRemaining] = createSignal(0);
  const [paused, setPaused] = createSignal(false);
  const [running, setRunning] = createSignal(false);

  let timer: ReturnType<typeof setInterval> | undefined;
  onCleanup(() => clearInterval(timer));

  function tick() {
    if (paused()) return;
    setRemaining((r) => {
      if (r <= 1) {
        next();
        return dur();
      }
      return r - 1;
    });
  }

  async function start() {
    const studies = await randomStudies(
      count(),
      tech() ? Number(tech()) : undefined,
    );
    if (studies.length === 0) return;
    setDeck(studies);
    setIdx(0);
    setRemaining(dur());
    setPaused(false);
    setRunning(true);
    clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  function next() {
    if (idx() + 1 >= deck().length) {
      stop();
    } else {
      setIdx((i) => i + 1);
      setRemaining(dur());
    }
  }
  function prev() {
    if (idx() > 0) {
      setIdx((i) => i - 1);
      setRemaining(dur());
    }
  }
  function stop() {
    clearInterval(timer);
    setRunning(false);
    setDeck([]);
  }

  const current = () => deck()[idx()];

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Praticar</h1>

      <Show
        when={running()}
        fallback={
          <div class="mt-6 max-w-md space-y-4">
            <p class="text-sm text-neutral-500">
              Sessão de gesture/estudo cronometrado com imagens do vault.
            </p>
            <label class="block">
              <span class="text-xs font-medium text-neutral-600">Tag</span>
              <select
                value={tech()}
                onChange={(e) => setTech(e.currentTarget.value)}
                class="mt-1 block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
              >
                <option value="">Qualquer (todas raster)</option>
                <For each={tags() ?? []}>
                  {(t) => (
                    <option value={t.id}>
                      {t.category ? `${t.category}: ` : ""}
                      {t.name}
                    </option>
                  )}
                </For>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-medium text-neutral-600">
                Quantidade
              </span>
              <input
                type="number"
                min="1"
                value={count()}
                onInput={(e) => setCount(+e.currentTarget.value || 1)}
                class="mt-1 block w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
              />
            </label>
            <div>
              <span class="text-xs font-medium text-neutral-600">
                Tempo por imagem
              </span>
              <div class="mt-1 flex gap-2">
                <For each={DURATIONS}>
                  {(d) => (
                    <button
                      type="button"
                      onClick={() => setDur(d.sec)}
                      class="rounded-md border px-3 py-1.5 text-sm transition-colors"
                      classList={{
                        "border-accent-400 bg-accent-50 text-accent-700":
                          dur() === d.sec,
                        "border-neutral-200 text-neutral-700": dur() !== d.sec,
                      }}
                    >
                      {d.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <button
              onClick={start}
              class="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Iniciar sessão
            </button>
          </div>
        }
      >
        <div class="mt-4">
          <div class="flex items-center justify-between text-sm text-neutral-500">
            <span>
              {idx() + 1} / {deck().length}
            </span>
            <span class="font-mono text-lg text-accent-700">
              {Math.floor(remaining() / 60)}:
              {String(remaining() % 60).padStart(2, "0")}
            </span>
          </div>
          <div class="mt-3 grid min-h-[60vh] place-items-center rounded-md border border-neutral-200 bg-neutral-900 p-4">
            <Show when={current()}>
              <img
                src={convertFileSrc(current().path)}
                alt=""
                class="max-h-[70vh] max-w-full object-contain"
              />
            </Show>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <button
              onClick={prev}
              disabled={idx() === 0}
              class="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-40"
            >
              ◀ anterior
            </button>
            <button
              onClick={() => setPaused((p) => !p)}
              class="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              {paused() ? "▶ retomar" : "⏸ pausar"}
            </button>
            <button
              onClick={next}
              class="rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-100"
            >
              pular ▶
            </button>
            <button
              onClick={stop}
              class="ml-auto rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              encerrar
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
