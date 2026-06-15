"""Helpers de query p/ tags, coleções, busca e notas. Centraliza SQL fora dos routers."""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from itertools import groupby

import markdown as _md

TAG_CATEGORIES = ["tecnica", "tema", "material", "dificuldade", "outro"]

WIKILINK = re.compile(r"\[\[([^\[\]]+)\]\]")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- tags ---

def all_tags(conn):
    return conn.execute(
        "SELECT t.id, t.name, t.category, COUNT(st.study_id) n "
        "FROM tag t LEFT JOIN study_tag st ON st.tag_id=t.id "
        "GROUP BY t.id ORDER BY t.category, t.name"
    ).fetchall()


def tags_for_study(conn, study_id: int):
    return conn.execute(
        "SELECT t.id, t.name, t.category FROM tag t "
        "JOIN study_tag st ON st.tag_id=t.id WHERE st.study_id=? "
        "ORDER BY t.category, t.name",
        (study_id,),
    ).fetchall()


def add_tag(conn, study_id: int, name: str, category: str) -> None:
    name = name.strip()
    if not name:
        return
    if category not in TAG_CATEGORIES:
        category = "outro"
    conn.execute(
        "INSERT OR IGNORE INTO tag(name, category) VALUES(?, ?)", (name, category)
    )
    row = conn.execute(
        "SELECT id FROM tag WHERE name=? AND category=?", (name, category)
    ).fetchone()
    conn.execute(
        "INSERT OR IGNORE INTO study_tag(study_id, tag_id) VALUES(?, ?)",
        (study_id, row["id"]),
    )


def remove_tag(conn, study_id: int, tag_id: int) -> None:
    conn.execute(
        "DELETE FROM study_tag WHERE study_id=? AND tag_id=?", (study_id, tag_id)
    )
    # apaga a tag órfã (sem nenhum estudo)
    conn.execute(
        "DELETE FROM tag WHERE id=? AND NOT EXISTS"
        "(SELECT 1 FROM study_tag WHERE tag_id=?)",
        (tag_id, tag_id),
    )


# --- coleções ---

def all_collections(conn):
    return conn.execute(
        "SELECT c.id, c.name, COUNT(cs.study_id) n "
        "FROM collection c LEFT JOIN collection_study cs ON cs.collection_id=c.id "
        "GROUP BY c.id ORDER BY c.name"
    ).fetchall()


def collections_for_study(conn, study_id: int):
    return conn.execute(
        "SELECT c.id, c.name FROM collection c "
        "JOIN collection_study cs ON cs.collection_id=c.id WHERE cs.study_id=? "
        "ORDER BY c.name",
        (study_id,),
    ).fetchall()


def create_collection(conn, name: str) -> None:
    name = name.strip()
    if name:
        conn.execute("INSERT OR IGNORE INTO collection(name) VALUES(?)", (name,))


def add_to_collection(conn, study_id: int, collection_id: int) -> None:
    conn.execute(
        "INSERT OR IGNORE INTO collection_study(collection_id, study_id) VALUES(?, ?)",
        (collection_id, study_id),
    )


def remove_from_collection(conn, study_id: int, collection_id: int) -> None:
    conn.execute(
        "DELETE FROM collection_study WHERE collection_id=? AND study_id=?",
        (collection_id, study_id),
    )


# --- busca / filtros ---

def search_studies(conn, q="", fmt="", tag_id=None, collection_id=None,
                   limit=60, offset=0):
    """Galeria filtrada. Combina busca textual + formato + tag + coleção (RF08)."""
    sql = ("SELECT DISTINCT s.id, s.filename, s.format, s.title, s.thumb_path, "
           "s.created_at FROM study s")
    joins, where, params = [], [], []

    if tag_id:
        joins.append("JOIN study_tag st ON st.study_id=s.id")
        where.append("st.tag_id=?"); params.append(tag_id)
    if collection_id:
        joins.append("JOIN collection_study cs ON cs.study_id=s.id")
        where.append("cs.collection_id=?"); params.append(collection_id)
    if q:
        like = f"%{q}%"
        where.append("(s.filename LIKE ? OR s.title LIKE ? OR EXISTS"
                     "(SELECT 1 FROM note n WHERE n.study_id=s.id AND n.body_md LIKE ?))")
        params += [like, like, like]
    if fmt:
        where.append("s.format=?"); params.append(fmt)

    sql += " " + " ".join(joins)
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY s.created_at DESC, s.id DESC LIMIT ? OFFSET ?"
    params += [limit, offset]

    items = conn.execute(sql, params).fetchall()

    # total (mesmos filtros, sem limit)
    csql = "SELECT COUNT(*) c FROM (" + sql.rsplit(" ORDER BY", 1)[0] + ")"
    total = conn.execute(csql, params[:-2]).fetchone()["c"]
    return items, total


# --- notas (RF11) ---

def list_notes(conn, study_id=None):
    if study_id is not None:
        return conn.execute(
            "SELECT id, title, study_id, updated_at FROM note WHERE study_id=? "
            "ORDER BY updated_at DESC", (study_id,)
        ).fetchall()
    return conn.execute(
        "SELECT id, title, study_id, updated_at FROM note ORDER BY updated_at DESC"
    ).fetchall()


def get_note(conn, note_id: int):
    return conn.execute("SELECT * FROM note WHERE id=?", (note_id,)).fetchone()


def create_note(conn, title: str, body: str = "", study_id=None) -> int:
    title = title.strip() or "Sem título"
    now = _now()
    cur = conn.execute(
        "INSERT INTO note(study_id, title, body_md, created_at, updated_at) "
        "VALUES(?,?,?,?,?)", (study_id, title, body, now, now)
    )
    nid = cur.lastrowid
    resync_links(conn)  # novo título pode resolver wikilinks pendentes de outras notas
    return nid


def update_note(conn, note_id: int, title: str, body: str) -> None:
    conn.execute(
        "UPDATE note SET title=?, body_md=?, updated_at=? WHERE id=?",
        (title.strip() or "Sem título", body, _now(), note_id),
    )
    resync_links(conn)


def delete_note(conn, note_id: int) -> None:
    conn.execute("DELETE FROM note WHERE id=?", (note_id,))


# --- wikilinks + backlinks (RF12) ---

def _sync_one(conn, note_id: int, body: str) -> None:
    conn.execute("DELETE FROM note_link WHERE src_note_id=?", (note_id,))
    for title in {t.strip() for t in WIKILINK.findall(body)}:
        row = conn.execute(
            "SELECT id FROM note WHERE title=? COLLATE NOCASE", (title,)
        ).fetchone()
        if row and row["id"] != note_id:
            conn.execute(
                "INSERT OR IGNORE INTO note_link(src_note_id, target_note_id) "
                "VALUES(?,?)", (note_id, row["id"])
            )


def resync_links(conn) -> None:
    """Re-resolve wikilinks de todas as notas (escala pessoal — barato)."""
    for n in conn.execute("SELECT id, body_md FROM note").fetchall():
        _sync_one(conn, n["id"], n["body_md"])


def backlinks(conn, note_id: int):
    return conn.execute(
        "SELECT n.id, n.title FROM note n "
        "JOIN note_link l ON l.src_note_id=n.id WHERE l.target_note_id=? "
        "ORDER BY n.title", (note_id,)
    ).fetchall()


def render_note_html(conn, body: str) -> str:
    """Converte wikilinks em links + renderiza markdown (RF14)."""
    def repl(m):
        title = m.group(1).strip()
        row = conn.execute(
            "SELECT id FROM note WHERE title=? COLLATE NOCASE", (title,)
        ).fetchone()
        if row:
            return f"[{title}](/note/{row['id']})"
        return f"[{title}](/notes?new={title}){{.missing}}"
    text = WIKILINK.sub(repl, body or "")
    return _md.markdown(text, extensions=["fenced_code", "tables", "nl2br", "attr_list"])


# --- planos (RF15) ---

def list_plans(conn):
    return conn.execute(
        "SELECT p.id, p.title, p.technique, p.deadline, "
        "(SELECT COUNT(*) FROM session s WHERE s.plan_id=p.id) n_sessions "
        "FROM plan p ORDER BY (p.deadline IS NULL), p.deadline, p.id DESC"
    ).fetchall()


def get_plan(conn, plan_id: int):
    return conn.execute("SELECT * FROM plan WHERE id=?", (plan_id,)).fetchone()


def create_plan(conn, title, goal="", technique="", deadline="") -> int:
    cur = conn.execute(
        "INSERT INTO plan(title, goal, technique, deadline, created_at) VALUES(?,?,?,?,?)",
        (title.strip() or "Plano", goal, technique, deadline or None, _now()),
    )
    return cur.lastrowid


def delete_plan(conn, plan_id: int) -> None:
    conn.execute("DELETE FROM plan WHERE id=?", (plan_id,))


# --- sessões (RF16/RF18) ---

def list_sessions(conn, plan_id=None, limit=200):
    if plan_id is not None:
        rows = conn.execute(
            "SELECT * FROM session WHERE plan_id=? ORDER BY date DESC, id DESC LIMIT ?",
            (plan_id, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM session ORDER BY date DESC, id DESC LIMIT ?", (limit,)
        ).fetchall()
    return rows


def create_session(conn, date, duration_min=None, technique="", notes="", plan_id=None) -> int:
    cur = conn.execute(
        "INSERT INTO session(plan_id, date, duration_min, technique, notes, done) "
        "VALUES(?,?,?,?,?,0)",
        (plan_id, date, duration_min or None, technique, notes),
    )
    return cur.lastrowid


def toggle_session_done(conn, session_id: int) -> None:
    conn.execute("UPDATE session SET done = 1 - done WHERE id=?", (session_id,))


def delete_session(conn, session_id: int) -> None:
    conn.execute("DELETE FROM session WHERE id=?", (session_id,))


def studies_for_session(conn, session_id: int):
    return conn.execute(
        "SELECT s.id, s.filename, s.title, s.thumb_path FROM study s "
        "JOIN session_study ss ON ss.study_id=s.id WHERE ss.session_id=? ORDER BY s.id",
        (session_id,),
    ).fetchall()


def link_session_study(conn, session_id: int, study_id: int) -> None:
    if conn.execute("SELECT 1 FROM study WHERE id=?", (study_id,)).fetchone():
        conn.execute(
            "INSERT OR IGNORE INTO session_study(session_id, study_id) VALUES(?,?)",
            (session_id, study_id),
        )


def unlink_session_study(conn, session_id: int, study_id: int) -> None:
    conn.execute(
        "DELETE FROM session_study WHERE session_id=? AND study_id=?",
        (session_id, study_id),
    )


# --- metas (RF17) ---

def list_goals(conn, plan_id=None):
    if plan_id is not None:
        return conn.execute(
            "SELECT * FROM goal WHERE plan_id=? ORDER BY id", (plan_id,)
        ).fetchall()
    return conn.execute("SELECT * FROM goal ORDER BY id").fetchall()


def create_goal(conn, description, target_count=None, period="semanal", plan_id=None) -> int:
    cur = conn.execute(
        "INSERT INTO goal(plan_id, description, target_count, period, progress) "
        "VALUES(?,?,?,?,0)",
        (plan_id, description.strip() or "Meta", target_count or None, period),
    )
    return cur.lastrowid


def inc_goal(conn, goal_id: int, delta: int = 1) -> None:
    conn.execute(
        "UPDATE goal SET progress = MAX(0, progress + ?) WHERE id=?", (delta, goal_id)
    )


def delete_goal(conn, goal_id: int) -> None:
    conn.execute("DELETE FROM goal WHERE id=?", (goal_id,))


# --- dashboard / stats (RF21) ---

def dashboard_stats(conn) -> dict:
    one = lambda sql: conn.execute(sql).fetchone()[0]
    minutes = one("SELECT COALESCE(SUM(duration_min),0) FROM session WHERE done=1") or 0
    return {
        "studies": one("SELECT COUNT(*) FROM study"),
        "notes": one("SELECT COUNT(*) FROM note"),
        "sessions": one("SELECT COUNT(*) FROM session"),
        "sessions_done": one("SELECT COUNT(*) FROM session WHERE done=1"),
        "minutes": minutes,
        "hours": round(minutes / 60, 1),
        "streak": _streak(conn),
    }


def studies_by_format(conn):
    return conn.execute(
        "SELECT format, COUNT(*) n FROM study GROUP BY format ORDER BY n DESC"
    ).fetchall()


def sessions_by_technique(conn):
    return conn.execute(
        "SELECT COALESCE(NULLIF(technique,''),'(sem técnica)') technique, "
        "COUNT(*) n, COALESCE(SUM(duration_min),0) minutes "
        "FROM session GROUP BY technique ORDER BY n DESC"
    ).fetchall()


def _session_dates(conn):
    return [date.fromisoformat(r["date"][:10])
            for r in conn.execute("SELECT DISTINCT date FROM session").fetchall()
            if r["date"]]


def _streak(conn) -> int:
    """Dias consecutivos com sessão, terminando hoje ou ontem (RF21)."""
    days = set(_session_dates(conn))
    if not days:
        return 0
    today = date.today()
    cur = today if today in days else today - timedelta(days=1)
    streak = 0
    while cur in days:
        streak += 1
        cur -= timedelta(days=1)
    return streak


def heatmap(conn, weeks: int = 53):
    """Grade tipo GitHub: sessões por dia nas últimas ~53 semanas (RF22)."""
    counts = {
        r["date"][:10]: r["n"]
        for r in conn.execute(
            "SELECT date, COUNT(*) n FROM session WHERE date IS NOT NULL GROUP BY date"
        ).fetchall()
    }
    today = date.today()
    start = today - timedelta(days=weeks * 7 - 1)
    start -= timedelta(days=start.weekday())  # alinha em segunda-feira
    grid, cur = [], start
    while cur <= today:
        col = []
        for i in range(7):
            d = cur + timedelta(days=i)
            n = counts.get(d.isoformat(), 0)
            level = 0 if n == 0 else min(4, n)
            col.append({"date": d.isoformat(), "n": n, "level": level,
                        "future": d > today})
        grid.append(col)
        cur += timedelta(days=7)
    return grid


# --- timeline (RF19) + antes/depois (RF20) ---

def timeline_groups(conn):
    rows = conn.execute(
        "SELECT id, filename, title, format, thumb_path, created_at FROM study "
        "WHERE created_at IS NOT NULL ORDER BY created_at DESC"
    ).fetchall()
    groups = []
    for ym, items in groupby(rows, key=lambda r: r["created_at"][:7]):
        groups.append({"label": ym, "items": list(items)})
    return groups


def technique_tags(conn):
    return conn.execute(
        "SELECT id, name FROM tag WHERE category='tecnica' ORDER BY name"
    ).fetchall()


def studies_by_tag_chrono(conn, tag_id: int):
    """Estudos de uma técnica, mais antigo → mais novo (evolução, RF20)."""
    return conn.execute(
        "SELECT s.id, s.filename, s.title, s.thumb_path, s.created_at FROM study s "
        "JOIN study_tag st ON st.study_id=s.id WHERE st.tag_id=? "
        "ORDER BY s.created_at ASC, s.id ASC", (tag_id,)
    ).fetchall()


# --- deck de sorteio (RF23) ---

def random_studies(conn, count=20, tag_id=None):
    """Estudos aleatórios p/ gesture/timed drawing. Só raster (têm imagem renderizável)."""
    raster = ("png", "jpg", "jpeg", "webp", "bmp")
    ph = ",".join("?" * len(raster))
    if tag_id:
        sql = (f"SELECT s.id FROM study s JOIN study_tag st ON st.study_id=s.id "
               f"WHERE st.tag_id=? AND s.format IN ({ph}) ORDER BY RANDOM() LIMIT ?")
        rows = conn.execute(sql, (tag_id, *raster, count)).fetchall()
    else:
        sql = (f"SELECT id FROM study WHERE format IN ({ph}) ORDER BY RANDOM() LIMIT ?")
        rows = conn.execute(sql, (*raster, count)).fetchall()
    return [r["id"] for r in rows]


# --- referências externas (RF24) ---

def references_for_study(conn, study_id: int):
    return conn.execute(
        "SELECT id, url, caption FROM reference WHERE study_id=? ORDER BY id",
        (study_id,),
    ).fetchall()


def add_reference(conn, study_id: int, url: str, caption: str = "") -> None:
    url = url.strip()
    if url:
        conn.execute(
            "INSERT INTO reference(study_id, url, caption, created_at) VALUES(?,?,?,?)",
            (study_id, url, caption.strip(), _now()),
        )


def remove_reference(conn, ref_id: int) -> None:
    conn.execute("DELETE FROM reference WHERE id=?", (ref_id,))


# --- anotações na imagem (RF26) ---

def annotations_for_study(conn, study_id: int):
    return conn.execute(
        "SELECT id, x, y, text FROM annotation WHERE study_id=? ORDER BY id",
        (study_id,),
    ).fetchall()


def add_annotation(conn, study_id: int, x: float, y: float, text: str) -> None:
    text = text.strip()
    if text:
        conn.execute(
            "INSERT INTO annotation(study_id, x, y, text, created_at) VALUES(?,?,?,?,?)",
            (study_id, x, y, text, _now()),
        )


def remove_annotation(conn, ann_id: int) -> None:
    conn.execute("DELETE FROM annotation WHERE id=?", (ann_id,))


# --- relatório de período (RF25) ---

def report_data(conn, start: str, end: str) -> dict:
    sessions = conn.execute(
        "SELECT * FROM session WHERE date >= ? AND date <= ? ORDER BY date",
        (start, end),
    ).fetchall()
    studies = conn.execute(
        "SELECT id, filename, title, thumb_path, created_at FROM study "
        "WHERE substr(created_at,1,10) >= ? AND substr(created_at,1,10) <= ? "
        "ORDER BY created_at", (start, end),
    ).fetchall()
    by_tech = conn.execute(
        "SELECT COALESCE(NULLIF(technique,''),'(sem técnica)') technique, "
        "COUNT(*) n, COALESCE(SUM(duration_min),0) minutes FROM session "
        "WHERE date >= ? AND date <= ? GROUP BY technique ORDER BY n DESC",
        (start, end),
    ).fetchall()
    minutes = sum((s["duration_min"] or 0) for s in sessions)
    return {
        "start": start, "end": end,
        "sessions": sessions, "studies": studies, "by_tech": by_tech,
        "n_sessions": len(sessions), "n_studies": len(studies),
        "minutes": minutes, "hours": round(minutes / 60, 1),
        "goals": list_goals(conn),
    }


# --- grafo (RF13) ---

def graph_data(conn) -> dict:
    nodes = [
        {"id": n["id"], "label": n["title"],
         "group": "study" if n["study_id"] else "note"}
        for n in conn.execute("SELECT id, title, study_id FROM note").fetchall()
    ]
    edges = [
        {"from": l["src_note_id"], "to": l["target_note_id"]}
        for l in conn.execute("SELECT src_note_id, target_note_id FROM note_link").fetchall()
    ]
    return {"nodes": nodes, "edges": edges}
