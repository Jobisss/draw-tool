"""Rotas de notas (RF11/12/14) e grafo (RF13)."""
from __future__ import annotations

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse

from .. import db, models
from ..templating import templates

router = APIRouter()


@router.get("/notes", response_class=HTMLResponse)
def list_notes(request: Request, new: str = ""):
    with db.get_db() as conn:
        notes = models.list_notes(conn)
    return templates.TemplateResponse(
        request, "notes.html", {"notes": notes, "new_title": new}
    )


@router.post("/notes")
def create_note(title: str = Form(...), body: str = Form(""),
                study_id: int | None = Form(None)):
    with db.get_db() as conn:
        nid = models.create_note(conn, title, body, study_id)
    return RedirectResponse(f"/note/{nid}", status_code=303)


@router.get("/note/{note_id}", response_class=HTMLResponse)
def view_note(request: Request, note_id: int, edit: int = 0):
    with db.get_db() as conn:
        note = models.get_note(conn, note_id)
        if not note:
            return HTMLResponse("Nota não encontrada.", status_code=404)
        html = models.render_note_html(conn, note["body_md"])
        back = models.backlinks(conn, note_id)
        study = None
        if note["study_id"]:
            study = conn.execute(
                "SELECT id, title, filename FROM study WHERE id=?", (note["study_id"],)
            ).fetchone()
    return templates.TemplateResponse(
        request, "note.html",
        {"note": note, "html": html, "backlinks": back, "study": study, "edit": edit},
    )


@router.post("/note/{note_id}")
def update_note(note_id: int, title: str = Form(...), body: str = Form("")):
    with db.get_db() as conn:
        models.update_note(conn, note_id, title, body)
    return RedirectResponse(f"/note/{note_id}", status_code=303)


@router.post("/note/{note_id}/delete")
def delete_note(note_id: int):
    with db.get_db() as conn:
        models.delete_note(conn, note_id)
    return RedirectResponse("/notes", status_code=303)


# nota vinculada a um estudo — cria e volta ao partial do estudo
@router.post("/study/{study_id}/notes", response_class=HTMLResponse)
def add_study_note(request: Request, study_id: int, title: str = Form(...),
                   body: str = Form("")):
    with db.get_db() as conn:
        models.create_note(conn, title, body, study_id)
        notes = models.list_notes(conn, study_id)
    return templates.TemplateResponse(
        request, "partials/study_notes.html", {"s": {"id": study_id}, "notes": notes}
    )


# --- grafo (RF13) ---

@router.get("/graph", response_class=HTMLResponse)
def graph_page(request: Request):
    return templates.TemplateResponse(request, "graph.html", {})


@router.get("/graph.json")
def graph_json():
    with db.get_db() as conn:
        return JSONResponse(models.graph_data(conn))
