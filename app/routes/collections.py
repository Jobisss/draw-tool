"""Rotas de coleções / pastas virtuais (RF09)."""
from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse

from .. import db, models
from ..templating import templates

router = APIRouter()


def _render_study_collections(request: Request, study_id: int):
    with db.get_db() as conn:
        ctx = {
            "s": {"id": study_id},
            "study_collections": models.collections_for_study(conn, study_id),
            "all_collections": models.all_collections(conn),
        }
    return templates.TemplateResponse(request, "partials/study_collections.html", ctx)


@router.get("/collections", response_class=HTMLResponse)
def list_collections(request: Request):
    with db.get_db() as conn:
        cols = models.all_collections(conn)
    return templates.TemplateResponse(
        request, "collections.html", {"collections": cols}
    )


@router.post("/collections", response_class=HTMLResponse)
def create(request: Request, name: str = Form(...)):
    with db.get_db() as conn:
        models.create_collection(conn, name)
        cols = models.all_collections(conn)
    return templates.TemplateResponse(
        request, "partials/collections_list.html", {"collections": cols}
    )


@router.post("/study/{study_id}/collections", response_class=HTMLResponse)
def add(request: Request, study_id: int, collection_id: int = Form(...)):
    with db.get_db() as conn:
        models.add_to_collection(conn, study_id, collection_id)
    return _render_study_collections(request, study_id)


@router.post("/study/{study_id}/collections/{collection_id}/remove",
             response_class=HTMLResponse)
def remove(request: Request, study_id: int, collection_id: int):
    with db.get_db() as conn:
        models.remove_from_collection(conn, study_id, collection_id)
    return _render_study_collections(request, study_id)
