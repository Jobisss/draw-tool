import { createSignal, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { todayPractices, currentWeekday, type TodayItem } from "../lib/today";
import { WEEKDAYS } from "../lib/plans";
import WeekStatus from "../components/WeekStatus";
import {
  logsForDate,
  logDone,
  undoLog,
  todayDate,
  type DayLog,
} from "../lib/logs";

export default function Today() {
  const [items, setItems] = createSignal<TodayItem[]>([]);
  const [logs, setLogs] = createSignal<DayLog[]>([]);
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

  return (
    <div class="p-8">
      <p class="text-sm font-medium uppercase tracking-wide text-accent-600">
        {WEEKDAYS[wd]} · hoje
      </p>
      <div class="flex items-baseline justify-between">
        <h1 class="mt-1 text-2xl font-semibold tracking-tight">O que praticar</h1>
        <Show when={items().length > 0}>
          <span class="text-sm text-neutral-500">
            {doneCount()}/{items().length} feito
          </span>
        </Show>
      </div>

      <WeekStatus refresh={version()} />

      <Show
        when={!loading()}
        fallback={<p class="mt-6 text-sm text-neutral-400">carregando…</p>}
      >
        <Show
          when={items().length > 0}
          fallback={
            <div class="mt-8 max-w-xl rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center">
              <p class="text-lg">🌿 Dia de descanso</p>
              <p class="mt-1 text-sm text-neutral-500">
                Nenhuma prática agendada para hoje. Configure o template semanal
                em{" "}
                <A href="/planos" class="text-accent-700 hover:underline">
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
                  onComplete={(note, min) => complete(it, note, min)}
                  onUndo={() => undo(it.id)}
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
  onComplete: (note: string, min: number | null) => void;
  onUndo: () => void;
}) {
  const [note, setNote] = createSignal("");
  const [min, setMin] = createSignal<number | "">("");

  const title = () =>
    props.item.technique ??
    props.item.subfolder ??
    props.item.note ??
    "Prática";

  return (
    <li class="rounded-md border border-neutral-200 bg-white px-4 py-3">
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
              class="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-accent-400 transition-colors hover:bg-accent-100"
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
            class="font-medium text-neutral-800"
            classList={{ "line-through text-neutral-400": !!props.log }}
          >
            {title()}
          </span>
          <div class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-neutral-500">
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
              <Show when={props.log!.quick_note || props.log!.duration_min}>
                <div class="mt-1 text-xs text-neutral-500">
                  <Show when={props.log!.duration_min}>
                    <span>{props.log!.duration_min} min</span>
                  </Show>
                  <Show when={props.log!.quick_note}>
                    <span class="ml-2 italic">{props.log!.quick_note}</span>
                  </Show>
                </div>
              </Show>
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
                class="w-20 rounded-md border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-accent-400"
              />
              <input
                value={note()}
                onInput={(e) => setNote(e.currentTarget.value)}
                placeholder="nota rápida (opcional)"
                class="flex-1 rounded-md border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-accent-400"
              />
            </div>
          </Show>
        </div>
      </div>
    </li>
  );
}
