import { For } from "solid-js";
import { A } from "@solidjs/router";

type NavItem = { path: string; label: string; icon: string };

const NAV: NavItem[] = [
  { path: "/", label: "Hoje", icon: "☀" },
  { path: "/biblioteca", label: "Biblioteca", icon: "▦" },
  { path: "/colecoes", label: "Coleções", icon: "❏" },
  { path: "/timeline", label: "Timeline", icon: "↗" },
  { path: "/painel", label: "Painel", icon: "▣" },
  { path: "/relatorio", label: "Relatório", icon: "⎙" },
  { path: "/notas", label: "Notas", icon: "✎" },
  { path: "/grafo", label: "Grafo", icon: "⬡" },
  { path: "/praticar", label: "Praticar", icon: "✦" },
  { path: "/planos", label: "Planos", icon: "▤" },
  { path: "/config", label: "Configurações", icon: "⚙" },
];

export default function Sidebar() {
  return (
    <aside class="no-print flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div class="flex items-center gap-2 px-4 py-4">
        <span class="grid h-8 w-8 place-items-center rounded-md bg-accent-500 font-bold text-white">
          D
        </span>
        <span class="font-semibold tracking-tight">draw-study</span>
      </div>
      <nav class="flex flex-col gap-0.5 px-2">
        <For each={NAV}>
          {(item) => (
            <A
              href={item.path}
              end={item.path === "/"}
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              activeClass="bg-accent-50 text-accent-700 font-medium hover:bg-accent-50 hover:text-accent-700"
            >
              <span class="w-4 text-center text-neutral-400">{item.icon}</span>
              {item.label}
            </A>
          )}
        </For>
      </nav>
    </aside>
  );
}
