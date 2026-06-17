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
  { path: "/planos", label: "Planos", icon: "▤" },
  { path: "/config", label: "Configurações", icon: "⚙" },
];

export default function Sidebar() {
  return (
    <aside class="no-print flex w-56 shrink-0 flex-col border-r border-line bg-surface">
      <div class="flex items-center gap-2 px-4 py-4">
        <img
          src="/lapis-logo.png"
          alt="draw-study logo"
          class="h-8 w-8 rounded-md object-contain"
        />
        <span class="font-semibold tracking-tight">draw-study</span>
      </div>
      <nav class="flex flex-col gap-0.5 px-2">
        <For each={NAV}>
          {(item) => (
            <A
              href={item.path}
              end={item.path === "/"}
              class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-surface2 hover:text-ink"
              activeClass="bg-accent-500/10 text-accent-300 font-medium hover:bg-accent-500/10 hover:text-accent-300"
            >
              <span class="w-4 text-center text-faint">{item.icon}</span>
              {item.label}
            </A>
          )}
        </For>
      </nav>
    </aside>
  );
}
