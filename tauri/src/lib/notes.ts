import { select, execute } from "./db";

export type Note = {
  id: number;
  study_id: number | null;
  title: string;
  body_md: string;
  created_at: string;
  updated_at: string;
};

export async function listNotes(): Promise<Note[]> {
  return select<Note>("SELECT * FROM note ORDER BY updated_at DESC");
}

export async function getNote(id: number): Promise<Note | null> {
  const rows = await select<Note>("SELECT * FROM note WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createNote(title: string): Promise<number> {
  const now = new Date().toISOString();
  const r = await execute(
    "INSERT INTO note (title, body_md, created_at, updated_at) VALUES ($1, '', $2, $2)",
    [title, now],
  );
  return r.lastInsertId as number;
}

export async function deleteNote(id: number): Promise<void> {
  await execute("DELETE FROM note WHERE id = $1", [id]);
}

/** Extrai títulos de `[[wikilink]]` do corpo. */
export function parseWikilinks(body: string): string[] {
  return [...body.matchAll(/\[\[([^\]\[]+)\]\]/g)].map((m) => m[1].trim());
}

/** Salva a nota e re-sincroniza note_link a partir dos `[[wikilinks]]` do corpo. */
export async function updateNote(
  id: number,
  title: string,
  body: string,
): Promise<void> {
  await execute(
    "UPDATE note SET title = $1, body_md = $2, updated_at = $3 WHERE id = $4",
    [title, body, new Date().toISOString(), id],
  );

  // resolve títulos → ids (case-insensitive) e regrava note_link de src=id
  const all = await listNotes();
  const byTitle = new Map(all.map((n) => [n.title.toLowerCase(), n.id]));
  await execute("DELETE FROM note_link WHERE src_note_id = $1", [id]);
  const seen = new Set<number>();
  for (const t of parseWikilinks(body)) {
    const tid = byTitle.get(t.toLowerCase());
    if (tid && tid !== id && !seen.has(tid)) {
      seen.add(tid);
      await execute(
        "INSERT OR IGNORE INTO note_link (src_note_id, target_note_id) VALUES ($1, $2)",
        [id, tid],
      );
    }
  }
}

export type NoteLink = { src_note_id: number; target_note_id: number };

/** Todas as arestas note_link (p/ o grafo). */
export async function allLinks(): Promise<NoteLink[]> {
  return select<NoteLink>(
    "SELECT src_note_id, target_note_id FROM note_link",
  );
}

/** Notas que apontam para esta (backlinks). */
export async function backlinks(id: number): Promise<Note[]> {
  return select<Note>(
    `SELECT n.* FROM note n
       JOIN note_link nl ON nl.src_note_id = n.id
      WHERE nl.target_note_id = $1 ORDER BY n.title`,
    [id],
  );
}
