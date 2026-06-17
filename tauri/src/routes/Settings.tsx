import { createSignal, onMount, Show } from "solid-js";
import { open, ask } from "@tauri-apps/plugin-dialog";
import { resetDatabase } from "../lib/db";
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

  const [resetting, setResetting] = createSignal(false);
  const [showResetModal, setShowResetModal] = createSignal(false);
  const [confirmText, setConfirmText] = createSignal("");
  const RESET_PHRASE = "EU VOU DELETAR TUDO";

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

  function openResetModal() {
    setConfirmText("");
    setShowResetModal(true);
  }
  function closeResetModal() {
    if (resetting()) return;
    setShowResetModal(false);
    setConfirmText("");
  }

  async function confirmReset() {
    if (confirmText().trim() !== RESET_PHRASE) return;
    setResetting(true);
    try {
      await resetDatabase();
      // recarrega pra refazer todos os resources do zero
      window.location.reload();
    } catch (e) {
      setResetting(false);
      await ask(`Falha no reset: ${String(e)}`, {
        title: "Erro",
        kind: "error",
      });
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
        <h2 class="text-sm font-medium text-ink">Pasta do vault</h2>
        <p class="mt-1 text-sm text-muted">
          Pasta-cofre com seus desenhos. O app indexa o conteúdo (somente leitura,
          exceto operações explícitas).
        </p>

        <div class="mt-3 flex items-center gap-3">
          <Show
            when={!loading()}
            fallback={<span class="text-sm text-faint">carregando…</span>}
          >
            <code class="flex-1 truncate rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
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
            class="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface2 disabled:opacity-50"
          >
            {scanning() ? "Indexando…" : "Indexar vault"}
          </button>
          <Show when={stats()}>
            <span class="text-sm text-muted">
              {stats()!.total} arquivos · +{stats()!.added} novos ·{" "}
              {stats()!.updated} atualizados · {stats()!.removed} removidos
              <Show when={thumbs() !== null}>
                {" "}· {thumbs()} thumbnails
              </Show>
            </span>
          </Show>
        </div>
        <Show when={scanErr()}>
          <p class="mt-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {scanErr()}
          </p>
        </Show>
      </section>

      <section class="mt-8 max-w-2xl border-t border-line pt-6">
        <h2 class="text-sm font-medium text-ink">
          Lembrete diário de prática
        </h2>
        <p class="mt-1 text-sm text-muted">
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
            class="rounded-md border border-line bg-surface text-ink px-2 py-1 text-sm outline-none focus:border-accent-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => sendReminder("Notificação de teste 🔔")}
            class="rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface2"
          >
            Testar
          </button>
        </div>
      </section>

      <section class="mt-8 max-w-2xl border-t border-red-500/30 pt-6">
        <h2 class="text-sm font-medium text-red-400">Zona de perigo</h2>
        <p class="mt-1 text-sm text-muted">
          Apaga todos os dados do app (notas, estudos, planos, índice,
          configurações). Os arquivos do vault não são tocados. Sem volta.
        </p>
        <button
          type="button"
          onClick={openResetModal}
          class="mt-3 rounded-md border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Resetar banco de dados
        </button>
      </section>

      {/* ---- modal de confirmação por digitação ---- */}
      <Show when={showResetModal()}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeResetModal}
        >
          <div
            class="w-full max-w-md rounded-lg border border-red-500/40 bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 class="text-lg font-semibold text-red-400">
              ⚠️ Resetar banco de dados
            </h3>
            <p class="mt-2 text-sm text-muted">
              Isso apaga <strong class="text-ink">TODOS</strong> os dados do app:
              notas, estudos, planos, índice e configurações. A ação{" "}
              <strong class="text-ink">não pode ser desfeita</strong>. Os
              arquivos do seu vault não são tocados.
            </p>
            <p class="mt-4 text-sm text-muted">
              Para confirmar, digite{" "}
              <code class="rounded bg-bg px-1.5 py-0.5 font-mono text-red-300">
                {RESET_PHRASE}
              </code>{" "}
              abaixo:
            </p>
            <input
              autofocus
              value={confirmText()}
              onInput={(e) => setConfirmText(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmReset();
                if (e.key === "Escape") closeResetModal();
              }}
              placeholder={RESET_PHRASE}
              disabled={resetting()}
              class="mt-2 w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-ink outline-none focus:border-red-500 disabled:opacity-50"
            />
            <div class="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeResetModal}
                disabled={resetting()}
                class="rounded-md border border-line px-4 py-2 text-sm text-muted hover:bg-surface2 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmReset}
                disabled={
                  resetting() || confirmText().trim() !== RESET_PHRASE
                }
                class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {resetting() ? "Apagando…" : "Apagar tudo"}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
