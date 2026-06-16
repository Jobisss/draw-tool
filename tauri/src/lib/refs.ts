import { select, execute } from "./db";

export type Reference = {
  id: number;
  study_id: number;
  url: string;
  caption: string | null;
  created_at: string;
};

export async function listReferences(studyId: number): Promise<Reference[]> {
  return select<Reference>(
    "SELECT * FROM reference WHERE study_id = $1 ORDER BY id",
    [studyId],
  );
}

export async function addReference(
  studyId: number,
  url: string,
  caption: string | null,
): Promise<void> {
  await execute(
    "INSERT INTO reference (study_id, url, caption, created_at) VALUES ($1, $2, $3, $4)",
    [studyId, url, caption, new Date().toISOString()],
  );
}

export async function deleteReference(id: number): Promise<void> {
  await execute("DELETE FROM reference WHERE id = $1", [id]);
}

export type Annotation = {
  id: number;
  study_id: number;
  x: number; // 0..100 (% largura)
  y: number; // 0..100 (% altura)
  text: string;
  created_at: string;
};

export async function listAnnotations(studyId: number): Promise<Annotation[]> {
  return select<Annotation>(
    "SELECT * FROM annotation WHERE study_id = $1 ORDER BY id",
    [studyId],
  );
}

export async function addAnnotation(
  studyId: number,
  x: number,
  y: number,
  text: string,
): Promise<void> {
  await execute(
    "INSERT INTO annotation (study_id, x, y, text, created_at) VALUES ($1, $2, $3, $4, $5)",
    [studyId, x, y, text, new Date().toISOString()],
  );
}

export async function deleteAnnotation(id: number): Promise<void> {
  await execute("DELETE FROM annotation WHERE id = $1", [id]);
}
