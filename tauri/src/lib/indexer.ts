import { invoke } from "@tauri-apps/api/core";
import { select, execute } from "./db";
import { getSetting, VAULT_PATH_KEY } from "./settings";
import { generateThumbnail } from "./api";

type Entry = {
  path: string;
  filename: string;
  format: string;
  hash: string;
  mtime: number;
  size_bytes: number;
};

export type ScanStats = {
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  total: number;
};

function stem(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i > 0 ? filename.slice(0, i) : filename;
}

/**
 * Indexa o vault: Rust faz walk + hash (read-only); aqui fazemos o diff/upsert em `study`
 * via plugin-sql e removemos os que sumiram. Retorna estatísticas.
 */
export async function scanVault(): Promise<ScanStats> {
  const vault = await getSetting(VAULT_PATH_KEY);
  if (!vault) throw new Error("Defina a pasta do vault em Configurações.");

  const entries = await invoke<Entry[]>("scan_vault", { vaultPath: vault });

  const existing = await select<{
    id: number;
    path: string;
    hash: string | null;
    mtime: number | null;
    size_bytes: number | null;
  }>("SELECT id, path, hash, mtime, size_bytes FROM study");

  const byPath = new Map(existing.map((r) => [r.path, r]));
  const seen = new Set<string>();
  const now = new Date().toISOString();
  let added = 0,
    updated = 0,
    unchanged = 0;

  for (const e of entries) {
    seen.add(e.path);
    const prev = byPath.get(e.path);
    const createdAt = new Date(e.mtime * 1000).toISOString();

    if (!prev) {
      await execute(
        `INSERT INTO study (path, filename, format, hash, mtime, size_bytes, title, indexed_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          e.path,
          e.filename,
          e.format,
          e.hash,
          e.mtime,
          e.size_bytes,
          stem(e.filename),
          now,
          createdAt,
        ],
      );
      added++;
    } else if (
      prev.hash !== e.hash ||
      prev.mtime !== e.mtime ||
      prev.size_bytes !== e.size_bytes
    ) {
      await execute(
        `UPDATE study SET filename = $1, format = $2, hash = $3, mtime = $4,
           size_bytes = $5, indexed_at = $6, created_at = $7 WHERE id = $8`,
        [e.filename, e.format, e.hash, e.mtime, e.size_bytes, now, createdAt, prev.id],
      );
      updated++;
    } else {
      unchanged++;
    }
  }

  const gone = existing.filter((r) => !seen.has(r.path));
  for (const r of gone) {
    await execute("DELETE FROM study WHERE id = $1", [r.id]);
  }

  return { added, updated, unchanged, removed: gone.length, total: entries.length };
}

/** Gera thumbnails p/ estudos sem thumb. Retorna quantos foram gerados. */
export async function generateMissingThumbnails(): Promise<number> {
  const rows = await select<{
    id: number;
    path: string;
    format: string;
    hash: string;
  }>("SELECT id, path, format, hash FROM study WHERE thumb_path IS NULL");

  let n = 0;
  for (const r of rows) {
    if (!r.hash) continue;
    try {
      const thumb = await generateThumbnail(r.path, r.format, r.hash);
      if (thumb) {
        await execute("UPDATE study SET thumb_path = $1 WHERE id = $2", [
          thumb,
          r.id,
        ]);
        n++;
      }
    } catch {
      // formato problemático → segue (placeholder na UI)
    }
  }
  return n;
}
