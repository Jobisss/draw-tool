import { createSignal, onMount, Show } from "solid-js";
import { open } from "@tauri-apps/plugin-dialog";
import { getSetting, setSetting, VAULT_PATH_KEY } from "../lib/settings";
import {
  scanVault,
  generateMissingThumbnails,
  type ScanStats,
} from "../lib/indexer";
import {
  NOTIFY_ENABLED,
  NOTIFY_TIME,
  sendReminder,
  ensurePermission,
} from "../lib/notify";

export default function Settings() {
  const [vault, setVault] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [scanning, setScanning] = createSignal(false);
  const [stats, setStats] = createSignal<ScanStats | null>(null);
  const [thumbs, setThumbs] = createSignal<number | null>(null);
  const [scanErr, setScanErr] = createSignal<string | null>(null);

  const [notifyOn, setNotifyOn] = createSignal(false);
  const [notifyTime, setNotifyTimeSig] = createSignal("19:00");

  onMount(async () => {
    setVault(await getSetting(VAULT_PATH_KEY));
    setNotifyOn((await getSetting(NOTIFY_ENABLED)) === "1");
    setNotifyTimeSig((await getSetting(NOTIFY_TIME)) ?? "19:00");
    setLoading(false);
  });

  async function toggleNotify(on: boolean) {
    setNotifyOn(on);
    await setSetting(NOTIFY_ENABLED, on ? "1" : "0");
    if (on) await ensurePermission();
  }
  async function saveNotifyTime(t: string) {
    setNotifyTimeSig(t);
    await setSetting(NOTIFY_TIME, t);
  }

  async function pickVault() {
    const dir = await open({
      directory: true,
      multiple: false,
      title: "Escolher pasta do vault",
    });
    if (typeof dir === "string") {
      await setSetting(VAULT_PATH_KEY, dir);
      setVault(dir);
    }
  }

  async function runScan() {
    setScanning(true);
    setScanErr(null);
    setStats(null);
    setThumbs(null);
    try {
      setStats(await scanVault());
      setThumbs(await generateMissingThumbnails());
    } catch (e) {
      setScanErr(String(e));
    } finally {
      setScanning(false);
    }
  }

  return (
    <div class="p-8">
      <h1 class="text-2xl font-semibold tracking-tight">Configurações</h1>

      <section class="mt-6 max-w-2xl">
        <h2 class="text-sm font-medium text-neutral-700">Pasta do vault</h2>
        <p class="mt-1 text-sm text-neutral-500">
          Pasta-cofre com seus desenhos. O app indexa o conteúdo (somente leitura,
          exceto operações explícitas).
        </p>

        <div class="mt-3 flex items-center gap-3">
          <Show
            when={!loading()}
            fallback={<span class="text-sm text-neutral-400">carregando…</span>}
          >
            <code class="flex-1 truncate rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
              {vault() ?? "— nenhuma pasta escolhida —"}
            </code>
          </Show>
          <button
            type="button"
            onClick={pickVault}
            class="shrink-0 rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
          >
            Escolher pasta…
          </button>
        </div>

        <div class="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={runScan}
            disabled={!vault() || scanning()}
            class="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
          >
            {scanning() ? "Indexando…" : "Indexar vault"}
          </button>
          <Show when={stats()}>
            <span class="text-sm text-neutral-600">
              {stats()!.total} arquivos · +{stats()!.added} novos ·{" "}
              {stats()!.updated} atualizados · {stats()!.removed} removidos
              <Show when={thumbs() !== null}>
                {" "}· {thumbs()} thumbnails
              </Show>
            </span>
          </Show>
        </div>
        <Show when={scanErr()}>
          <p class="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {scanErr()}
          </p>
        </Show>
      </section>

      <section class="mt-8 max-w-2xl border-t border-neutral-200 pt-6">
        <h2 class="text-sm font-medium text-neutral-700">
          Lembrete diário de prática
        </h2>
        <p class="mt-1 text-sm text-neutral-500">
          Notificação no horário escolhido (enquanto o app estiver aberto).
        </p>
        <div class="mt-3 flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notifyOn()}
              onChange={(e) => toggleNotify(e.currentTarget.checked)}
            />
            Ativar
          </label>
          <input
            type="time"
            value={notifyTime()}
            onChange={(e) => saveNotifyTime(e.currentTarget.value)}
            disabled={!notifyOn()}
            class="rounded-md border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-accent-400 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => sendReminder("Notificação de teste 🔔")}
            class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Testar
          </button>
        </div>
      </section>
    </div>
  );
}
