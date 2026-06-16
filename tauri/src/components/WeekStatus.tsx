import { createSignal, createEffect, Show } from "solid-js";
import { consistency, type Consistency } from "../lib/consistency";

export default function WeekStatus(props: { refresh?: number }) {
  const [c, setC] = createSignal<Consistency | null>(null);

  createEffect(() => {
    props.refresh; // re-roda quando o pai sinaliza mudança
    consistency().then(setC);
  });

  const pct = () => {
    const v = c();
    if (!v || v.goal <= 0) return 0;
    return Math.min(100, Math.round((v.daysThisWeek / v.goal) * 100));
  };

  return (
    <Show when={c()}>
      <div class="mt-4 max-w-2xl rounded-md border border-line bg-surface p-4">
        <Show
          when={c()!.goal > 0}
          fallback={
            <p class="text-sm text-muted">
              Defina uma meta semanal nos seus planos para acompanhar a
              consistência.
            </p>
          }
        >
          <div class="flex items-center justify-between text-sm">
            <span class="font-medium text-ink">
              Semana: {c()!.daysThisWeek}/{c()!.goal} dias
            </span>
            <Show when={c()!.streak > 0}>
              <span class="font-medium text-accent-300">
                🔥 {c()!.streak}{" "}
                {c()!.streak === 1 ? "semana" : "semanas"}
              </span>
            </Show>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-surface2">
            <div
              class="h-full rounded-full bg-accent-500 transition-all"
              style={{ width: `${pct()}%` }}
            />
          </div>
        </Show>
      </div>
    </Show>
  );
}
