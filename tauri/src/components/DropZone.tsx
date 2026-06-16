import { createSignal, onMount, onCleanup, For, Show } from "solid-js";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { importStudy } from "../lib/api";
import { getSetting, VAULT_PATH_KEY } from "../lib/settings";
import { listPlans, type Plan } from "../lib/plans";

const EXT = [
  "png", "jpg", "jpeg", "webp", "bmp", "psd", "clip", "procreate", "kra", "pdf", "md",
];

export default function DropZone(props: { onImported: () => void }) {
  const [hover, setHover] = createSignal(false);
  const [srcs, setSrcs] = createSignal<string[]>([]);
  const [plans, setPlans] = createSignal<Plan[]>([]);
  const [planId, setPlanId] = createSignal<number | null>(null);
  const [subfolder, setSubfolder] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [msg, setMsg] = createSignal<string | null>(null);

  onMount(async () => {
    const ps = (await listPlans()).filter((p) => p.folder_path);
    setPlans(ps);
    if (ps[0]) setPlanId(ps[0].id);

    const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
      const p = event.payload;
      if (p.type === "enter" || p.type === "over") setHover(true);
      else if (p.type === "drop") {
        setHover(false);
        if (p.paths?.length) setSrcs(p.paths);
      } else setHover(false);
    });
    onCleanup(unlisten);
  });

  async function pick() {
    const sel = await open({
      multiple: true,
      filters: [{ name: "Estudos", extensions: EXT }],
    });
    if (Array.isArray(sel)) setSrcs(sel);
    else if (typeof sel === "string") setSrcs([sel]);
  }

  async function doImport() {
    const plan = plans().find((p) => p.id === planId());
    if (!plan?.folder_path) {
      setMsg("Escolha um plano com pasta no vault.");
      return;
    }
    const vault = await getSetting(VAULT_PATH_KEY);
    if (!vault) {
      setMsg("Defina o vault em Configurações.");
      return;
    }
    const sub = subfolder().trim();
    const dest = sub ? `${plan.folder_path}\\${sub}` : plan.folder_path;

    setBusy(true);
    setMsg(null);
    try {
      for (const src of srcs()) {
        await importStudy(vault, dest, src);
      }
      setMsg(`${srcs().length} arquivo(s) importado(s).`);
      setSrcs([]);
      props.onImported();
    } catch (e) {
      setMsg(`Erro: ${e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      class="rounded-md border-2 border-dashed p-4 transition-colors"
      classList={{
        "border-accent-400 bg-accent-50": hover(),
        "border-neutral-300 bg-white": !hover(),
      }}
    >
      <Show
        when={srcs().length > 0}
        fallback={
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-neutral-500">
              Arraste arquivos aqui para importar para um plano.
            </span>
            <button
              type="button"
              onClick={pick}
              class="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              Selecionar arquivos…
            </button>
          </div>
        }
      >
        <div class="flex flex-wrap items-end gap-3">
          <span class="text-sm text-neutral-700">
            {srcs().length} arquivo(s) pronto(s):
          </span>
          <label>
            <span class="block text-xs font-medium text-neutral-600">Plano</span>
            <select
              value={planId() ?? ""}
              onChange={(e) => setPlanId(Number(e.currentTarget.value))}
              class="mt-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
            >
              <For each={plans()}>
                {(p) => <option value={p.id}>{p.name}</option>}
              </For>
            </select>
          </label>
          <label>
            <span class="block text-xs font-medium text-neutral-600">
              Subpasta (opcional)
            </span>
            <input
              value={subfolder()}
              onInput={(e) => setSubfolder(e.currentTarget.value)}
              placeholder="gesture"
              class="mt-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent-400"
            />
          </label>
          <button
            type="button"
            disabled={busy()}
            onClick={doImport}
            class="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
          >
            {busy() ? "Importando…" : "Importar"}
          </button>
          <button
            type="button"
            onClick={() => setSrcs([])}
            class="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            Cancelar
          </button>
        </div>
      </Show>
      <Show when={msg()}>
        <p class="mt-2 text-sm text-neutral-600">{msg()}</p>
      </Show>
    </div>
  );
}
