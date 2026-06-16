import { createResource, createMemo, For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { listNotes, allLinks } from "../lib/notes";

const W = 720;
const H = 520;

export default function Graph() {
  const navigate = useNavigate();
  const [notes] = createResource(listNotes);
  const [links] = createResource(allLinks);

  // layout circular: posição de cada nota por id
  const pos = createMemo(() => {
    const ns = notes() ?? [];
    const cx = W / 2,
      cy = H / 2,
      r = Math.min(W, H) / 2 - 60;
    const m = new Map<number, { x: number; y: number; title: string }>();
    ns.forEach((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(1, ns.length) - Math.PI / 2;
      m.set(n.id, {
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
        title: n.title,
      });
    });
    return m;
  });

  const edges = createMemo(() =>
    (links() ?? [])
      .map((l) => ({
        a: pos().get(l.src_note_id),
        b: pos().get(l.target_note_id),
      }))
      .filter((e) => e.a && e.b),
  );

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Grafo</h1>
      <p class="mt-1 text-sm text-muted">
        Notas e seus vínculos (<code>[[wikilinks]]</code>). Clique num nó para
        abrir.
      </p>

      <Show
        when={(notes() ?? []).length > 0}
        fallback={
          <p class="mt-8 text-sm text-faint">
            Nenhuma nota ainda. Crie em Notas.
          </p>
        }
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          class="mt-6 max-w-3xl rounded-md border border-line bg-surface"
        >
          <For each={edges()}>
            {(e) => (
              <line
                x1={e.a!.x}
                y1={e.a!.y}
                x2={e.b!.x}
                y2={e.b!.y}
                stroke="#33334a"
                stroke-width="1.5"
              />
            )}
          </For>
          <For each={[...pos().entries()]}>
            {([id, p]) => (
              <g
                class="cursor-pointer"
                onClick={() => navigate(`/notas/${id}`)}
              >
                <circle cx={p.x} cy={p.y} r="8" fill="#4a5cf5" />
                <text
                  x={p.x}
                  y={p.y - 14}
                  text-anchor="middle"
                  class="fill-[#c5c5d4] text-xs"
                >
                  {p.title}
                </text>
              </g>
            )}
          </For>
        </svg>
      </Show>
    </div>
  );
}
