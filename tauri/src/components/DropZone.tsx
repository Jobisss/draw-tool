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
  const [destFolder, setDestFolder] = createSignal<string | null>(null);
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

  async function pickFolder() {
    const vault = await getSetting(VAULT_PATH_KEY);
    const sel = await open({ directory: true, defaultPath: vault ?? undefined });
    if (typeof sel === "string") setDestFolder(sel);
  }

  async function doImport() {
    const vault = await getSetting(VAULT_PATH_KEY);
    if (!vault) {
      setMsg("Defina o vault em Configurações.");
      return;
    }
    const plan = plans().find((p) => p.id === planId());
    let dest: string;
    if (plan?.folder_path) {
      const sub = subfolder().trim();
      dest = sub ? `${plan.folder_path}\\${sub}` : plan.folder_path;
    } else if (destFolder()) {
      dest = destFolder()!;
    } else {
      setMsg("Escolha um plano ou uma pasta destino no vault.");
      return;
    }

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
        "border-accent-500 bg-accent-500/10": hover(),
        "border-line bg-surface": !hover(),
      }}
    >
      <Show
        when={srcs().length > 0}
        fallback={
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-muted">
              Arraste arquivos aqui para importar (com ou sem plano).
            </span>
            <button
              type="button"
              onClick={pick}
              class="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
            >
              Selecionar arquivos…
            </button>
          </div>
        }
      >
        <div class="flex flex-wrap items-end gap-3">
          <span class="text-sm text-ink">
            {srcs().length} arquivo(s) pronto(s):
          </span>
          <label>
            <span class="block text-xs font-medium text-muted">Plano</span>
            <select
              value={planId() ?? ""}
              onChange={(e) => {
                const v = e.currentTarget.value;
                setPlanId(v ? Number(v) : null);
              }}
              class="mt-1 rounded-md border border-line bg-surface text-ink px-3 py-2 text-sm outline-none focus:border-accent-500"
            >
              <option value="">(sem plano)</option>
              <For each={plans()}>
                {(p) => <option value={p.id}>{p.name}</option>}
              </For>
            </select>
          </label>
          <Show
            when={planId() !== null}
            fallback={
              <label>
                <span class="block text-xs font-medium text-muted">
                  Pasta destino
                </span>
                <div class="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={pickFolder}
                    class="rounded-md border border-line px-3 py-2 text-sm text-ink hover:bg-surface2"
                  >
                    Escolher pasta…
                  </button>
                  <Show when={destFolder()}>
                    <span class="max-w-[16rem] truncate font-mono text-xs text-muted">
                      {destFolder()}
                    </span>
                  </Show>
                </div>
              </label>
            }
          >
            <label>
              <span class="block text-xs font-medium text-muted">
                Subpasta (opcional)
              </span>
              <input
                value={subfolder()}
                onInput={(e) => setSubfolder(e.currentTarget.value)}
                placeholder="gesture"
                class="mt-1 rounded-md border border-line bg-surface text-ink px-3 py-2 text-sm outline-none focus:border-accent-500"
              />
            </label>
          </Show>
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
            class="rounded-md border border-line px-3 py-2 text-sm text-muted hover:bg-surface2"
          >
            Cancelar
          </button>
        </div>
      </Show>
      <Show when={msg()}>
        <p class="mt-2 text-sm text-muted">{msg()}</p>
      </Show>
    </div>
  );
}
