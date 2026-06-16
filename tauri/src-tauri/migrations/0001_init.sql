-- draw-study v2 — schema inicial (SQLite via tauri-plugin-sql)
-- Base herdada da v1 (03-modelo-dados.md) + planner reescrito da v2 (06-tauri-arquitetura.md).
-- Datas em ISO-8601 (TEXT). Boolean = INTEGER 0/1.

CREATE TABLE study (
    id          INTEGER PRIMARY KEY,
    path        TEXT NOT NULL UNIQUE,        -- caminho absoluto no vault
    filename    TEXT NOT NULL,
    format      TEXT NOT NULL,               -- png|jpg|webp|bmp|psd|clip|procreate|kra|pdf|md
    hash        TEXT,                        -- conteúdo (detecção de alteração)
    mtime       REAL,                        -- mtime do FS
    size_bytes  INTEGER,
    title       TEXT,                        -- editável; default = filename
    thumb_path  TEXT,                        -- caminho do thumbnail em cache (nullable)
    indexed_at  TEXT NOT NULL,
    created_at  TEXT,                        -- data do arquivo (EXIF/mtime)
    course_id   INTEGER REFERENCES course(id) ON DELETE SET NULL,  -- v2
    lesson      TEXT                         -- v2: lição do curso
);

CREATE TABLE tag (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    category  TEXT,                          -- tecnica|tema|material|dificuldade|outro
    UNIQUE(name, category)
);
CREATE TABLE study_tag (
    study_id INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tag(id)   ON DELETE CASCADE,
    PRIMARY KEY (study_id, tag_id)
);

CREATE TABLE note (
    id         INTEGER PRIMARY KEY,
    study_id   INTEGER REFERENCES study(id) ON DELETE SET NULL,  -- nullable = nota avulsa
    title      TEXT NOT NULL,
    body_md    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE note_link (
    src_note_id    INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    target_note_id INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    PRIMARY KEY (src_note_id, target_note_id)
);

CREATE TABLE collection (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE collection_study (
    collection_id INTEGER NOT NULL REFERENCES collection(id) ON DELETE CASCADE,
    study_id      INTEGER NOT NULL REFERENCES study(id)      ON DELETE CASCADE,
    PRIMARY KEY (collection_id, study_id)
);

CREATE TABLE reference (
    id         INTEGER PRIMARY KEY,
    study_id   INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    caption    TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE annotation (
    id         INTEGER PRIMARY KEY,
    study_id   INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
    x          REAL NOT NULL,                -- 0..100 (% da largura)
    y          REAL NOT NULL,                -- 0..100 (% da altura)
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE setting (
    key   TEXT PRIMARY KEY,                  -- ex.: 'vault_path'
    value TEXT
);

-- ── Planner v2 (substitui plan/session/goal da v1) ──────────────────────────
CREATE TABLE course (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE plan (
    id               INTEGER PRIMARY KEY,
    name             TEXT NOT NULL,
    folder_path      TEXT,                   -- pasta do plano no vault
    weekly_goal_days INTEGER,                -- meta semanal (ex: 5)
    active           INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL
);
CREATE TABLE plan_slot (                     -- template semanal recorrente
    id        INTEGER PRIMARY KEY,
    plan_id   INTEGER REFERENCES plan(id) ON DELETE CASCADE,
    weekday   INTEGER NOT NULL,              -- 0=seg .. 6=dom
    technique TEXT,
    subfolder TEXT,
    note      TEXT
);
CREATE TABLE day_log (                       -- registro diário (fiz/não fiz + anexos)
    id           INTEGER PRIMARY KEY,
    plan_id      INTEGER REFERENCES plan(id)      ON DELETE SET NULL,
    slot_id      INTEGER REFERENCES plan_slot(id) ON DELETE SET NULL,
    date         TEXT NOT NULL,
    done         INTEGER NOT NULL DEFAULT 1,
    study_id     INTEGER REFERENCES study(id)     ON DELETE SET NULL,
    quick_note   TEXT,
    duration_min INTEGER,
    created_at   TEXT NOT NULL
);

-- Índices úteis
CREATE INDEX idx_study_format    ON study(format);
CREATE INDEX idx_study_created   ON study(created_at);
CREATE INDEX idx_study_course    ON study(course_id);
CREATE INDEX idx_note_study      ON note(study_id);
CREATE INDEX idx_reference_study ON reference(study_id);
CREATE INDEX idx_annotation_study ON annotation(study_id);
CREATE INDEX idx_plan_slot_plan  ON plan_slot(plan_id);
CREATE INDEX idx_day_log_date    ON day_log(date);
CREATE INDEX idx_day_log_plan    ON day_log(plan_id);
