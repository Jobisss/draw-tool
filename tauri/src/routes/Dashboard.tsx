import { createResource, createSignal, For, Show } from "solid-js";
import { dashboardStats, logHeatmap, studiesByPlan } from "../lib/stats";
import { mondayOf } from "../lib/consistency";
import { todayDate } from "../lib/logs";

const WEEKS = 53;

function heatClass(n: number): string {
  if (n <= 0) return "bg-surface2";
  if (n === 1) return "bg-accent-200";
  if (n === 2) return "bg-accent-300";
  if (n === 3) return "bg-accent-400";
  return "bg-accent-500";
}

export default function Dashboard() {
  const [stats] = createResource(dashboardStats);
  const [heat] = createResource(logHeatmap);
  const [byPlan] = createResource(studiesByPlan);
  const [hover, setHover] = createSignal<{ date: string; count: number } | null>(
    null,
  );

  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  // grade do heatmap: WEEKS colunas (segunda-início) terminando nesta semana
  const columns = () => {
    const start = mondayOf();
    start.setDate(start.getDate() - (WEEKS - 1) * 7);
    const map = heat() ?? new Map<string, number>();
    const cols: { date: string; count: number }[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + w * 7 + d);
        const key = todayDate(dt);
        col.push({ date: key, count: map.get(key) ?? 0 });
      }
      cols.push(col);
    }
    return cols;
  };

  const maxPlan = () =>
    Math.max(1, ...(byPlan() ?? []).map((t) => t.count));

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Painel</h1>

      <Show when={stats()}>
        <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card label="🔥 Streak" value={`${stats()!.consistency.streak} sem`} />
          <Card
            label="Semana"
            value={`${stats()!.consistency.daysThisWeek}/${stats()!.consistency.goal} dias`}
          />
          <Card
            label="Horas"
            value={(stats()!.totalMin / 60).toFixed(1)}
          />
          <Card label="Estudos" value={String(stats()!.studyCount)} />
        </div>
      </Show>

      {/* Heatmap */}
      <section class="mt-8">
        <div class="flex items-baseline justify-between">
          <h2 class="text-sm font-medium text-ink">Atividade</h2>
          <span class="text-xs text-muted">
            <Show when={hover()} fallback="passe o mouse num dia">
              {fmtDate(hover()!.date)} ·{" "}
              {hover()!.count === 1
                ? "1 prática"
                : `${hover()!.count} práticas`}
            </Show>
          </span>
        </div>
        <div
          class="mt-3 flex gap-[3px] overflow-x-auto rounded-md border border-line bg-surface p-3"
          onMouseLeave={() => setHover(null)}
        >
          <For each={columns()}>
            {(col) => (
              <div class="flex flex-col gap-[3px]">
                <For each={col}>
                  {(cell) => (
                    <div
                      class={`h-3 w-3 rounded-sm ${heatClass(cell.count)}`}
                      onMouseEnter={() =>
                        setHover({ date: cell.date, count: cell.count })
                      }
                    />
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </section>

      {/* Por plano */}
      <section class="mt-8 max-w-xl">
        <h2 class="text-sm font-medium text-ink">Estudos por plano</h2>
        <Show
          when={(byPlan() ?? []).length > 0}
          fallback={
            <p class="mt-2 text-sm text-faint">Sem estudos ainda.</p>
          }
        >
          <div class="mt-3 space-y-2">
            <For each={byPlan()}>
              {(t) => (
                <div class="flex items-center gap-3 text-sm">
                  <span class="w-32 truncate text-muted">{t.name}</span>
                  <div class="h-3 flex-1 overflow-hidden rounded-full bg-surface2">
                    <div
                      class="h-full rounded-full bg-accent-500"
                      style={{ width: `${(t.count / maxPlan()) * 100}%` }}
                    />
                  </div>
                  <span class="w-8 text-right text-muted">{t.count}</span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </section>
    </div>
  );
}

function Card(props: { label: string; value: string }) {
  return (
    <div class="rounded-md border border-line bg-surface p-4">
      <p class="text-xs uppercase tracking-wide text-faint">
        {props.label}
      </p>
      <p class="mt-1 text-2xl font-semibold tracking-tight">{props.value}</p>
    </div>
  );
}
