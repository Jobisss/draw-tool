import { createSignal, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { todayPractices, currentWeekday, type TodayItem } from "../lib/today";
import { WEEKDAYS } from "../lib/plans";
import WeekStatus from "../components/WeekStatus";
import {
  logsForDate,
  logDone,
  undoLog,
  setLogStudy,
  todayDate,
  type DayLog,
} from "../lib/logs";
import { importStudy } from "../lib/api";
import { scanVault, generateMissingThumbnails } from "../lib/indexer";
import { getSetting, VAULT_PATH_KEY } from "../lib/settings";
import { getStudy, getStudyByPath, type Study } from "../lib/studies";

const ART_EXT = ["png", "jpg", "jpeg", "webp", "bmp", "psd", "clip", "procreate", "kra", "pdf"];

export default function Today() {
  const [items, setItems] = createSignal<TodayItem[]>([]);
  const [logs, setLogs] = createSignal<DayLog[]>([]);
  const [arts, setArts] = createSignal<Map<number, Study>>(new Map());
  const [loading, setLoading] = createSignal(true);
  const [version, setVersion] = createSignal(0);
  const wd = currentWeekday();
  const date = todayDate();

  async function reload() {
    const [its, lgs] = await Promise.all([
      todayPractices(),
      logsForDate(date),
    ]);
    setItems(its);
    setLogs(lgs);
    // estudos anexados (p/ mostrar thumbnail)
    const map = new Map<number, Study>();
    for (const l of lgs) {
      if (l.study_id) {
        const st = await getStudy(l.study_id);
        if (st) map.set(l.study_id, st);
      }
    }
    setArts(map);
    setVersion((v) => v + 1);
  }

  onMount(async () => {
    await reload();
    setLoading(false);
  });

  const logFor = (slotId: number) => logs().find((l) => l.slot_id === slotId);

  const doneCount = () => items().filter((it) => logFor(it.id)).length;

  async function complete(it: TodayItem, note: string, min: number | null) {
    await logDone(it.plan_id, it.id, date, note.trim() || null, min);
    await reload();
  }

  async function undo(slotId: number) {
    await undoLog(slotId, date);
    await reload();
  }

  /** Anexa uma arte à execução: importa p/ a pasta do plano → indexa → liga ao day_log. */
  async function attach(it: TodayItem, log: DayLog) {
    const sel = await open({
      multiple: false,
      filters: [{ name: "Arte", extensions: ART_EXT }],
    });
    if (typeof sel !== "string") return;
    const vault = await getSetting(VAULT_PATH_KEY);
    if (!vault) return;
    const base = it.folder_path || vault;
    const dest = it.subfolder ? `${base}\\${it.subfolder}` : base;
    const newPath = await importStudy(vault, dest, sel);
    await scanVault();
    await generateMissingThumbnails();
    const study = await getStudyByPath(newPath);
    if (study) await setLogStudy(log.id, study.id);
    await reload();
  }

  return (
    <div class="p-8">
      <p class="text-sm font-medium uppercase tracking-wide text-accent-300">
        {WEEKDAYS[wd]} · hoje
      </p>
      <div class="flex items-baseline justify-between">
        <h1 class="mt-1 text-2xl font-semibold tracking-tight">O que praticar</h1>
        <Show when={items().length > 0}>
          <span class="text-sm text-muted">
            {doneCount()}/{items().length} feito
          </span>
        </Show>
      </div>

      <WeekStatus refresh={version()} />

      <Show
        when={!loading()}
        fallback={<p class="mt-6 text-sm text-faint">carregando…</p>}
      >
        <Show
          when={items().length > 0}
          fallback={
            <div class="mt-8 max-w-xl rounded-md border border-dashed border-line bg-surface p-8 text-center">
              <p class="text-lg">🌿 Dia de descanso</p>
              <p class="mt-1 text-sm text-muted">
                Nenhuma prática agendada para hoje. Configure o template semanal
                em{" "}
                <A href="/planos" class="text-accent-300 hover:underline">
                  Planos
                </A>
                .
              </p>
            </div>
          }
        >
          <ul class="mt-6 max-w-2xl space-y-2">
            <For each={items()}>
              {(it) => (
                <PracticeItem
                  item={it}
                  log={logFor(it.id)}
                  art={(() => {
                    const l = logFor(it.id);
                    return l?.study_id ? arts().get(l.study_id) : undefined;
                  })()}
                  onComplete={(note, min) => complete(it, note, min)}
                  onUndo={() => undo(it.id)}
                  onAttach={(log) => attach(it, log)}
                />
              )}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
}

function PracticeItem(props: {
  item: TodayItem;
  log: DayLog | undefined;
  art: Study | undefined;
  onComplete: (note: string, min: number | null) => void;
  onUndo: () => void;
  onAttach: (log: DayLog) => void;
}) {
  const [note, setNote] = createSignal("");
  const [min, setMin] = createSignal<number | "">("");

  const title = () =>
    props.item.technique ??
    props.item.subfolder ??
    props.item.note ??
    "Prática";

  return (
    <li class="rounded-md border border-line bg-surface px-4 py-3">
      <div class="flex items-start gap-3">
        <Show
          when={props.log}
          fallback={
            <button
              type="button"
              onClick={() =>
                props.onComplete(note(), min() === "" ? null : Number(min()))
              }
              title="Marcar como feito"
              class="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-accent-500 transition-colors hover:bg-accent-500/15"
            />
          }
        >
          <button
            type="button"
            onClick={() => props.onUndo()}
            title="Desfazer"
            class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-500 text-xs text-white"
          >
            ✓
          </button>
        </Show>

        <div class="min-w-0 flex-1">
          <span
            class="font-medium text-ink"
            classList={{ "line-through text-faint": !!props.log }}
          >
            {title()}
          </span>
          <div class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
            <span>{props.item.plan_name}</span>
            <Show when={props.item.subfolder}>
              <span>📁 {props.item.subfolder}</span>
            </Show>
            <Show when={props.item.note}>
              <span>{props.item.note}</span>
            </Show>
          </div>

          <Show
            when={!props.log}
            fallback={
              <>
                <Show when={props.log!.quick_note || props.log!.duration_min}>
                  <div class="mt-1 text-xs text-muted">
                    <Show when={props.log!.duration_min}>
                      <span>{props.log!.duration_min} min</span>
                    </Show>
                    <Show when={props.log!.quick_note}>
                      <span class="ml-2 italic">{props.log!.quick_note}</span>
                    </Show>
                  </div>
                </Show>
                <Show
                  when={props.log!.study_id}
                  fallback={
                    <button
                      type="button"
                      onClick={() => props.onAttach(props.log!)}
                      class="mt-1 text-xs text-accent-300 hover:underline"
                    >
                      + anexar arte
                    </button>
                  }
                >
                  <A
                    href={`/biblioteca/${props.log!.study_id}`}
                    class="mt-2 flex items-center gap-2 rounded-md border border-line bg-bg p-1.5 hover:border-accent-500/60"
                  >
                    <span class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded bg-surface2">
                      <Show
                        when={props.art?.thumb_path}
                        fallback={
                          <span class="text-[10px] uppercase text-faint">
                            {props.art?.format ?? "arte"}
                          </span>
                        }
                      >
                        <img
                          src={convertFileSrc(props.art!.thumb_path!)}
                          alt=""
                          class="h-full w-full object-cover"
                        />
                      </Show>
                    </span>
                    <span class="text-xs text-accent-300">
                      🎨 arte anexada · ver na biblioteca
                    </span>
                  </A>
                </Show>
              </>
            }
          >
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="number"
                min="0"
                value={min()}
                onInput={(e) =>
                  setMin(e.currentTarget.value === "" ? "" : +e.currentTarget.value)
                }
                placeholder="min"
                class="w-20 rounded-md border border-line bg-surface text-ink px-2 py-1 text-xs outline-none focus:border-accent-500"
              />
              <input
                value={note()}
                onInput={(e) => setNote(e.currentTarget.value)}
                placeholder="nota rápida (opcional)"
                class="flex-1 rounded-md border border-line bg-surface text-ink px-2 py-1 text-xs outline-none focus:border-accent-500"
              />
            </div>
          </Show>
        </div>
      </div>
    </li>
  );
}
