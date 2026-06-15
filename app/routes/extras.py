"""Fase 6: deck/timer (RF23), referências (RF24), relatório (RF25), anotações (RF26)."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from .. import db, models
from ..templating import templates

router = APIRouter()


# --- deck de sorteio + timer (RF23) ---

@router.get("/practice", response_class=HTMLResponse)
def practice(request: Request):
    with db.get_db() as conn:
        techs = models.technique_tags(conn)
    return templates.TemplateResponse(request, "practice.html", {"technique_tags": techs})


@router.get("/practice/queue.json")
def practice_queue(count: int = 20, tag: int | None = None):
    with db.get_db() as conn:
        ids = models.random_studies(conn, count=count, tag_id=tag)
    return JSONResponse({"ids": ids})


# --- referências externas (RF24) ---

def _render_refs(request: Request, study_id: int):
    with db.get_db() as conn:
        refs = models.references_for_study(conn, study_id)
    return templates.TemplateResponse(
        request, "partials/study_references.html", {"s": {"id": study_id}, "references": refs}
    )


@router.post("/study/{study_id}/references", response_class=HTMLResponse)
def add_reference(request: Request, study_id: int, url: str = Form(...),
                  caption: str = Form("")):
    with db.get_db() as conn:
        models.add_reference(conn, study_id, url, caption)
    return _render_refs(request, study_id)


@router.post("/study/{study_id}/references/{ref_id}/remove", response_class=HTMLResponse)
def remove_reference(request: Request, study_id: int, ref_id: int):
    with db.get_db() as conn:
        models.remove_reference(conn, ref_id)
    return _render_refs(request, study_id)


# --- anotações na imagem (RF26) ---

@router.post("/study/{study_id}/annotations")
def add_annotation(study_id: int, x: float = Form(...), y: float = Form(...),
                   text: str = Form(...)):
    with db.get_db() as conn:
        models.add_annotation(conn, study_id, x, y, text)
    return RedirectResponse(f"/study/{study_id}", status_code=303)


@router.post("/study/{study_id}/annotations/{ann_id}/remove")
def remove_annotation(study_id: int, ann_id: int):
    with db.get_db() as conn:
        models.remove_annotation(conn, ann_id)
    return RedirectResponse(f"/study/{study_id}", status_code=303)


# --- relatório de período (RF25) ---

@router.get("/report", response_class=HTMLResponse)
def report(request: Request, start: str = "", end: str = ""):
    today = date.today()
    if not end:
        end = today.isoformat()
    if not start:
        start = (today - timedelta(days=30)).isoformat()
    with db.get_db() as conn:
        data = models.report_data(conn, start, end)
    return templates.TemplateResponse(request, "report.html", data)
