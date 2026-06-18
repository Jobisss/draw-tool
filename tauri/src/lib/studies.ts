import { select, execute } from "./db";

export type Study = {
  id: number;
  path: string;
  filename: string;
  format: string;
  hash: string | null;
  mtime: number | null;
  size_bytes: number | null;
  title: string | null;
  thumb_path: string | null;
  indexed_at: string;
  created_at: string | null;
  course_id: number | null;
  lesson: string | null;
};

function getPathWithoutExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return filePath;
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastDot > lastSlash) {
    return filePath.slice(0, lastDot);
  }
  return filePath;
}

export async function listStudies(
  opts: { search?: string; format?: string; collectionId?: number } = {},
): Promise<Study[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts.search?.trim()) {
    params.push(`%${opts.search.trim()}%`);
    const i = params.length;
    where.push(`(filename LIKE $${i} OR title LIKE $${i})`);
  }
  if (opts.format) {
    params.push(opts.format);
    where.push(`format = $${params.length}`);
  }
  if (opts.collectionId) {
    params.push(opts.collectionId);
    where.push(
      `EXISTS(SELECT 1 FROM collection_study cs
         WHERE cs.study_id = study.id AND cs.collection_id = $${params.length})`,
    );
  }

  const sql =
    `SELECT * FROM study ${where.length ? "WHERE " + where.join(" AND ") : ""}` +
    ` ORDER BY created_at DESC, filename`;
  const rows = await select<Study>(sql, params);

  // Filtra duplicados (mesmo nome/caminho sem extensão), priorizando PNG
  const groups = new Map<string, Study[]>();
  for (const s of rows) {
    const key = getPathWithoutExtension(s.path).toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(s);
  }

  const filtered: Study[] = [];
  for (const group of groups.values()) {
    if (group.length > 1) {
      const pngStudy = group.find((s) => s.format.toLowerCase() === "png");
      if (pngStudy) {
        filtered.push(pngStudy);
        continue;
      }
    }
    filtered.push(...group);
  }
  return filtered;
}

/** Remove o estudo do índice (cascade tags/coleções/refs/anotações; day_log.study_id→NULL). */
export async function deleteStudy(id: number): Promise<void> {
  await execute("DELETE FROM study WHERE id = $1", [id]);
}

/** Define a data do estudo (created_at). `date` = YYYY-MM-DD; null limpa. */
export async function setStudyDate(
  id: number,
  date: string | null,
): Promise<void> {
  await execute("UPDATE study SET created_at = $1 WHERE id = $2", [date, id]);
}

export async function getStudy(id: number): Promise<Study | null> {
  const rows = await select<Study>("SELECT * FROM study WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function getStudyByPath(path: string): Promise<Study | null> {
  const rows = await select<Study>("SELECT * FROM study WHERE path = $1", [
    path,
  ]);
  return rows[0] ?? null;
}

export async function distinctFormats(): Promise<string[]> {
  const rows = await select<{ format: string }>(
    "SELECT DISTINCT format FROM study ORDER BY format",
  );
  return rows.map((r) => r.format);
}

/** Formatos que possuem imagem exibível inline (raster) na webview. */
export const RASTER = new Set(["png", "jpg", "jpeg", "webp", "bmp"]);
