"""Conexão e schema SQLite. Schema completo conforme documents/03-modelo-dados.md."""
import sqlite3
from contextlib import contextmanager

from . import config

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS study (
    id          INTEGER PRIMARY KEY,
    path        TEXT NOT NULL UNIQUE,
    filename    TEXT NOT NULL,
    format      TEXT NOT NULL,
    hash        TEXT,
    mtime       REAL,
    size_bytes  INTEGER,
    title       TEXT,
    thumb_path  TEXT,
    indexed_at  TEXT NOT NULL,
    created_at  TEXT
);

CREATE TABLE IF NOT EXISTS tag (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    category  TEXT,
    UNIQUE(name, category)
);
CREATE TABLE IF NOT EXISTS study_tag (
    study_id INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
    tag_id   INTEGER NOT NULL REFERENCES tag(id)   ON DELETE CASCADE,
    PRIMARY KEY (study_id, tag_id)
);

CREATE TABLE IF NOT EXISTS note (
    id         INTEGER PRIMARY KEY,
    study_id   INTEGER REFERENCES study(id) ON DELETE SET NULL,
    title      TEXT NOT NULL,
    body_md    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS note_link (
    src_note_id    INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    target_note_id INTEGER NOT NULL REFERENCES note(id) ON DELETE CASCADE,
    PRIMARY KEY (src_note_id, target_note_id)
);

CREATE TABLE IF NOT EXISTS collection (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS collection_study (
    collection_id INTEGER NOT NULL REFERENCES collection(id) ON DELETE CASCADE,
    study_id      INTEGER NOT NULL REFERENCES study(id)      ON DELETE CASCADE,
    PRIMARY KEY (collection_id, study_id)
);

CREATE TABLE IF NOT EXISTS plan (
    id         INTEGER PRIMARY KEY,
    title      TEXT NOT NULL,
    goal       TEXT,
    technique  TEXT,
    deadline   TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS session (
    id           INTEGER PRIMARY KEY,
    plan_id      INTEGER REFERENCES plan(id) ON DELETE SET NULL,
    date         TEXT NOT NULL,
    duration_min INTEGER,
    technique    TEXT,
    notes        TEXT,
    done         INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS session_study (
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    study_id   INTEGER NOT NULL REFERENCES study(id)   ON DELETE CASCADE,
    PRIMARY KEY (session_id, study_id)
);

CREATE TABLE IF NOT EXISTS goal (
    id           INTEGER PRIMARY KEY,
    plan_id      INTEGER REFERENCES plan(id) ON DELETE CASCADE,
    description  TEXT NOT NULL,
    target_count INTEGER,
    period       TEXT,
    progress     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS setting (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- Fase 6: referências externas (RF24) e anotações na imagem (RF26)
CREATE TABLE IF NOT EXISTS reference (
    id         INTEGER PRIMARY KEY,
    study_id   INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    caption    TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS annotation (
    id         INTEGER PRIMARY KEY,
    study_id   INTEGER NOT NULL REFERENCES study(id) ON DELETE CASCADE,
    x          REAL NOT NULL,   -- 0..100 (% da largura)
    y          REAL NOT NULL,   -- 0..100 (% da altura)
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_study_format  ON study(format);
CREATE INDEX IF NOT EXISTS idx_study_created ON study(created_at);
CREATE INDEX IF NOT EXISTS idx_note_study    ON note(study_id);
CREATE INDEX IF NOT EXISTS idx_session_date  ON session(date);
CREATE INDEX IF NOT EXISTS idx_reference_study  ON reference(study_id);
CREATE INDEX IF NOT EXISTS idx_annotation_study ON annotation(study_id);
"""


def connect() -> sqlite3.Connection:
    config.ensure_dirs()
    conn = sqlite3.connect(config.DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db():
    conn = connect()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Cria o schema se não existir. Idempotente."""
    with get_db() as conn:
        conn.executescript(SCHEMA)


# --- settings helpers ---

def get_setting(key: str, default: str | None = None) -> str | None:
    with get_db() as conn:
        row = conn.execute("SELECT value FROM setting WHERE key = ?", (key,)).fetchone()
        return row["value"] if row else default


def set_setting(key: str, value: str) -> None:
    with get_db() as conn:
        conn.execute(
            "INSERT INTO setting(key, value) VALUES(?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )
