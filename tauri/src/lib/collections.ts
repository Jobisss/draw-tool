import { select, execute } from "./db";
import type { Study } from "./studies";

export type Collection = { id: number; name: string };

export async function listCollections(): Promise<Collection[]> {
  return select<Collection>("SELECT * FROM collection ORDER BY name");
}

export async function createCollection(name: string): Promise<number> {
  const r = await execute("INSERT INTO collection (name) VALUES ($1)", [name]);
  return r.lastInsertId as number;
}

export async function deleteCollection(id: number): Promise<void> {
  await execute("DELETE FROM collection WHERE id = $1", [id]);
}

export async function collectionsForStudy(
  studyId: number,
): Promise<Collection[]> {
  return select<Collection>(
    `SELECT c.* FROM collection c
       JOIN collection_study cs ON cs.collection_id = c.id
      WHERE cs.study_id = $1 ORDER BY c.name`,
    [studyId],
  );
}

export async function studiesInCollection(
  collectionId: number,
): Promise<Study[]> {
  return select<Study>(
    `SELECT s.* FROM study s
       JOIN collection_study cs ON cs.study_id = s.id
      WHERE cs.collection_id = $1
      ORDER BY s.created_at DESC, s.filename`,
    [collectionId],
  );
}

export async function addToCollection(
  collectionId: number,
  studyId: number,
): Promise<void> {
  await execute(
    "INSERT OR IGNORE INTO collection_study (collection_id, study_id) VALUES ($1, $2)",
    [collectionId, studyId],
  );
}

export async function removeFromCollection(
  collectionId: number,
  studyId: number,
): Promise<void> {
  await execute(
    "DELETE FROM collection_study WHERE collection_id = $1 AND study_id = $2",
    [collectionId, studyId],
  );
}
