import { select, execute } from "./db";

export type Tag = { id: number; name: string; category: string | null };

export const TAG_CATEGORIES = [
  "tecnica",
  "tema",
  "material",
  "dificuldade",
  "outro",
];

export async function listTags(): Promise<Tag[]> {
  return select<Tag>("SELECT * FROM tag ORDER BY category, name");
}

export async function tagsForStudy(studyId: number): Promise<Tag[]> {
  return select<Tag>(
    `SELECT t.* FROM tag t
       JOIN study_tag st ON st.tag_id = t.id
      WHERE st.study_id = $1
      ORDER BY t.category, t.name`,
    [studyId],
  );
}

/** Cria a tag se não existir (name+category) e vincula ao estudo. */
export async function addTagToStudy(
  studyId: number,
  name: string,
  category: string,
): Promise<void> {
  const found = await select<{ id: number }>(
    "SELECT id FROM tag WHERE name = $1 AND category = $2",
    [name, category],
  );
  let tagId: number;
  if (found[0]) {
    tagId = found[0].id;
  } else {
    const r = await execute("INSERT INTO tag (name, category) VALUES ($1, $2)", [
      name,
      category,
    ]);
    tagId = r.lastInsertId as number;
  }
  await execute(
    "INSERT OR IGNORE INTO study_tag (study_id, tag_id) VALUES ($1, $2)",
    [studyId, tagId],
  );
}

export async function removeTagFromStudy(
  studyId: number,
  tagId: number,
): Promise<void> {
  await execute("DELETE FROM study_tag WHERE study_id = $1 AND tag_id = $2", [
    studyId,
    tagId,
  ]);
}
