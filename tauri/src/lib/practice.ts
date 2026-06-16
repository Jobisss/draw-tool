import { select } from "./db";
import type { Study } from "./studies";

const RASTER_FMT = "('png','jpg','jpeg','webp','bmp')";

/** Sorteia estudos raster (opcionalmente de uma técnica) p/ uma sessão de prática. */
export async function randomStudies(
  count: number,
  techniqueTagId?: number,
): Promise<Study[]> {
  if (techniqueTagId) {
    return select<Study>(
      `SELECT s.* FROM study s
         JOIN study_tag st ON st.study_id = s.id
        WHERE st.tag_id = $1 AND s.format IN ${RASTER_FMT}
        ORDER BY RANDOM() LIMIT $2`,
      [techniqueTagId, count],
    );
  }
  return select<Study>(
    `SELECT * FROM study WHERE format IN ${RASTER_FMT} ORDER BY RANDOM() LIMIT $1`,
    [count],
  );
}
