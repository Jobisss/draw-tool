import { select } from "./db";

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

export async function listStudies(
  opts: { search?: string; format?: string; collectionId?: number } = {},
): Promise<Study[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (opts.search?.trim()) {
    params.push(`%${opts.search.trim()}%`);
    const i = params.length;
    where.push(
      `(filename LIKE $${i} OR title LIKE $${i} OR EXISTS(
         SELECT 1 FROM study_tag st JOIN tag t ON t.id = st.tag_id
          WHERE st.study_id = study.id AND t.name LIKE $${i}))`,
    );
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
  return select<Study>(sql, params);
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

export async function distinctFormats(): Promise<string[]> {
  const rows = await select<{ format: string }>(
    "SELECT DISTINCT format FROM study ORDER BY format",
  );
  return rows.map((r) => r.format);
}

/** Formatos que possuem imagem exibível inline (raster) na webview. */
export const RASTER = new Set(["png", "jpg", "jpeg", "webp", "bmp"]);
