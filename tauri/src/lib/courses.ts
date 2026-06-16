import { select, execute } from "./db";

export type Course = { id: number; name: string };

export async function listCourses(): Promise<Course[]> {
  return select<Course>("SELECT * FROM course ORDER BY name");
}

export async function createCourse(name: string): Promise<number> {
  const r = await execute("INSERT INTO course (name) VALUES ($1)", [name]);
  return r.lastInsertId as number;
}

/** Vincula (ou desvincula) um estudo a um curso + lição. */
export async function setStudyCourse(
  studyId: number,
  courseId: number | null,
  lesson: string | null,
): Promise<void> {
  await execute("UPDATE study SET course_id = $1, lesson = $2 WHERE id = $3", [
    courseId,
    lesson,
    studyId,
  ]);
}
