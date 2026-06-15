"""Rotas da biblioteca: galeria com busca/filtros, detalhe, re-scan, thumbnail/original."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, HTMLResponse, Response

from .. import db, indexer, models
from ..templating import templates

router = APIRouter()

PAGE_SIZE = 60


def _qs(q, fmt, tag, collection, offset):
    """Monta query string preservando filtros ativos (p/ load-more)."""
    parts = []
    if q: parts.append(f"q={q}")
    if fmt: parts.append(f"fmt={fmt}")
    if tag: parts.append(f"tag={tag}")
    if collection: parts.append(f"collection={collection}")
    parts.append(f"offset={offset}")
    return "&".join(parts)


def _gallery_ctx(conn, request, q, fmt, tag, collection, offset, stats=None):
    items, total = models.search_studies(
        conn, q=q, fmt=fmt, tag_id=tag, collection_id=collection,
        limit=PAGE_SIZE, offset=offset,
    )
    formats = [r["format"] for r in conn.execute(
        "SELECT DISTINCT format FROM study ORDER BY format")]
    col = None
    if collection:
        col = conn.execute("SELECT name FROM collection WHERE id=?", (collection,)).fetchone()
    return {
        "vault": db.get_setting("vault_path"),
        "items": items,
        "total": total,
        "offset": offset,
        "next_offset": offset + PAGE_SIZE,
        "has_more": offset + PAGE_SIZE < total,
        "q": q, "fmt": fmt, "tag": tag, "collection": collection,
        "col_name": col["name"] if col else None,
        "formats": formats,
        "all_tags": models.all_tags(conn),
        "all_collections": models.all_collections(conn),
        "more_qs": _qs(q, fmt, tag, collection, offset + PAGE_SIZE),
        "stats": stats,
    }


@router.get("/", response_class=HTMLResponse)
def index(request: Request, q: str = "", fmt: str = "", tag: int | None = None,
          collection: int | None = None, offset: int = 0):
    with db.get_db() as conn:
        ctx = _gallery_ctx(conn, request, q, fmt, tag, collection, offset)
    hx = request.headers.get("HX-Request")
    if hx and offset > 0:
        return templates.TemplateResponse(request, "partials/gallery_items.html", ctx)
    if hx:
        return templates.TemplateResponse(request, "partials/gallery.html", ctx)
    return templates.TemplateResponse(request, "index.html", ctx)


@router.post("/rescan", response_class=HTMLResponse)
def rescan(request: Request):
    stats = indexer.scan()
    with db.get_db() as conn:
        ctx = _gallery_ctx(conn, request, "", "", None, None, 0, stats=stats)
    return templates.TemplateResponse(request, "partials/gallery.html", ctx)


@router.get("/study/{study_id}", response_class=HTMLResponse)
def detail(request: Request, study_id: int):
    with db.get_db() as conn:
        s = conn.execute("SELECT * FROM study WHERE id=?", (study_id,)).fetchone()
        if not s:
            return HTMLResponse("Estudo não encontrado.", status_code=404)
        ctx = {
            "s": s,
            "tags": models.tags_for_study(conn, study_id),
            "categories": models.TAG_CATEGORIES,
            "study_collections": models.collections_for_study(conn, study_id),
            "all_collections": models.all_collections(conn),
            "notes": models.list_notes(conn, study_id),
            "references": models.references_for_study(conn, study_id),
            "annotations": models.annotations_for_study(conn, study_id),
        }
    return templates.TemplateResponse(request, "detail.html", ctx)


@router.get("/thumb/{study_id}")
def thumb(study_id: int):
    with db.get_db() as conn:
        s = conn.execute("SELECT thumb_path FROM study WHERE id=?", (study_id,)).fetchone()
    if s and s["thumb_path"] and Path(s["thumb_path"]).exists():
        return FileResponse(s["thumb_path"], media_type="image/webp")
    return Response(status_code=404)


@router.get("/file/{study_id}")
def original(study_id: int):
    """Serve o arquivo original (somente leitura) — RF05."""
    with db.get_db() as conn:
        s = conn.execute("SELECT path FROM study WHERE id=?", (study_id,)).fetchone()
    if not s:
        return Response(status_code=404)
    p = Path(s["path"])
    if not p.exists():
        return Response(status_code=404)
    return FileResponse(p)
