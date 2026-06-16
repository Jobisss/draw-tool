import { createSignal, createResource, For, Show } from "solid-js";
import { reportData } from "../lib/report";
import { todayDate } from "../lib/logs";

function monthStart(): string {
  const d = new Date();
  return todayDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export default function Report() {
  const [start, setStart] = createSignal(monthStart());
  const [end, setEnd] = createSignal(todayDate());

  const [data] = createResource(
    () => ({ s: start(), e: end() }),
    (r) => reportData(r.s, r.e),
  );

  return (
    <div class="p-8">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold tracking-tight">Relatório</h1>
        <button
          onClick={() => window.print()}
          class="no-print rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          Imprimir / PDF
        </button>
      </div>

      <div class="no-print mt-4 flex flex-wrap items-end gap-3">
        <label>
          <span class="block text-xs font-medium text-muted">De</span>
          <input
            type="date"
            value={start()}
            onChange={(e) => setStart(e.currentTarget.value)}
            class="mt-1 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-accent-500"
          />
        </label>
        <label>
          <span class="block text-xs font-medium text-muted">Até</span>
          <input
            type="date"
            value={end()}
            onChange={(e) => setEnd(e.currentTarget.value)}
            class="mt-1 rounded-md border border-line px-2 py-1 text-sm outline-none focus:border-accent-500"
          />
        </label>
      </div>

      <p class="mt-4 text-sm text-muted">
        Período: {start()} a {end()}
      </p>

      <Show when={data()}>
        <div class="mt-4 grid max-w-2xl grid-cols-3 gap-3">
          <Stat label="Dias praticados" value={String(data()!.practiceDays)} />
          <Stat label="Horas" value={(data()!.totalMin / 60).toFixed(1)} />
          <Stat label="Estudos" value={String(data()!.studyCount)} />
        </div>

        <section class="mt-6 max-w-2xl">
          <h2 class="text-sm font-medium text-ink">Por técnica</h2>
          <Show
            when={data()!.byTechnique.length > 0}
            fallback={
              <p class="mt-2 text-sm text-faint">
                Sem estudos com técnica no período.
              </p>
            }
          >
            <table class="mt-2 w-full text-sm">
              <tbody>
                <For each={data()!.byTechnique}>
                  {(t) => (
                    <tr class="border-b border-line">
                      <td class="py-1 text-ink">{t.name}</td>
                      <td class="py-1 text-right text-muted">{t.count}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </Show>
        </section>
      </Show>
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div class="rounded-md border border-line bg-surface p-4">
      <p class="text-xs uppercase tracking-wide text-faint">
        {props.label}
      </p>
      <p class="mt-1 text-2xl font-semibold tracking-tight">{props.value}</p>
    </div>
  );
}
