# 03 — Modelo de Dados (SQLite)

Banco: `data/db.sqlite`. `PRAGMA foreign_keys = ON`. Datas em ISO-8601 (TEXT).

## Entidades
- **study** — um arquivo de desenho indexado do vault.
- **tag** + **study_tag** — categorização n:n.
- **note** — nota markdown (vinculada a um estudo ou avulsa).
- **note_link** — wikilink direcionado entre notas (gera backlinks).
- **collection** + **collection_study** — pastas virtuais n:n.
- **plan** — plano de estudo (objetivo/técnica/prazo).
- **session** + **session_study** — sessão de prática; estudos produzidos n:n.
- **goal** — meta quantificável com acompanhamento.
- **setting** — chave/valor (ex.: caminho do vault).

## Diagrama (texto)
```
study ─< study_tag >─ tag
study ─< collection_study >─ collection
study ─1:n─ note
note  ─< note_link >─ note        (src → target)
plan  ─1:n─ session ─< session_study >─ study
plan  ─1:n─ goal
```

## DDL (referência — implementar em app/db.py)
```sql
CREATE TABLE study (
    id          INTEGER PRIMARY KEY,
    path        TEXT NOT NULL UNIQUE,      -- caminho absoluto no vault
    filename    TEXT NOT NULL,
    format      TEXT NOT NULL,             -- png|jpg|webp|bmp|psd|clip|procreate|kra|pdf|md
    hash        TEXT,                      -- conteúdo (detecção de alteração)
    mtime       REAL,                      -- mtime do FS
    size_bytes  INTEGER,
    title       TEXT,                      -- editável; default = filename
    thumb_path  TEXT,                      -- caminho do thumbnail em cache (nullable)
    indexed_at  TEXT NOT NULL,
    created_at  TEXT                       -- data do arquivo (EXIF/mtime)
);

CREATE TABLE tag (
    id        INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    category  TEXT,                        -- tecnica|tema|material|dificuldade|outro
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

CREATE TABLE plan (
    id         INTEGER PRIMARY KEY,
    title      TEXT NOT NULL,
    goal       TEXT,                       -- objetivo descritivo
    technique  TEXT,                       -- técnica-alvo
    deadline   TEXT,                       -- data limite
    created_at TEXT NOT NULL
);
CREATE TABLE session (
    id           INTEGER PRIMARY KEY,
    plan_id      INTEGER REFERENCES plan(id) ON DELETE SET NULL,
    date         TEXT NOT NULL,
    duration_min INTEGER,
    technique    TEXT,
    notes        TEXT,
    done         INTEGER NOT NULL DEFAULT 0  -- boolean 0/1
);
CREATE TABLE session_study (
    session_id INTEGER NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    study_id   INTEGER NOT NULL REFERENCES study(id)   ON DELETE CASCADE,
    PRIMARY KEY (session_id, study_id)
);

CREATE TABLE goal (
    id           INTEGER PRIMARY KEY,
    plan_id      INTEGER REFERENCES plan(id) ON DELETE CASCADE,
    description  TEXT NOT NULL,
    target_count INTEGER,                  -- ex.: 30
    period       TEXT,                     -- diario|semanal|mensal
    progress     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE setting (
    key   TEXT PRIMARY KEY,               -- ex.: 'vault_path'
    value TEXT
);

-- Índices úteis
CREATE INDEX idx_study_format   ON study(format);
CREATE INDEX idx_study_created  ON study(created_at);
CREATE INDEX idx_note_study     ON note(study_id);
CREATE INDEX idx_session_date   ON session(date);
```

## Busca (RF08)
MVP: `LIKE` em `study.filename/title`, `tag.name`, `note.body_md`.
Futuro: tabela **FTS5** virtual sobre `note.body_md` + `study.title` se o volume crescer.

## Notas de implementação
- **Diff de re-scan (RF04):** comparar `hash`+`mtime` do FS com a linha em `study`. Ausente no
  FS → marcar removido (soft) ou apagar linha; presente e hash mudou → regerar thumbnail.
- **Wikilinks (RF12):** ao salvar nota, parsear `[[Título]]`, resolver p/ `note.id`, sincronizar
  `note_link`. Backlinks = query reversa em `note_link`.
- **Boolean** representado como INTEGER 0/1 (`done`).

> Detalhe de uso de cada entidade em `04-features.md`.
