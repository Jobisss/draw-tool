"""Rotas de tags (RF07). Operam sobre um estudo e devolvem o partial de tags atualizado."""
from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse

from .. import db, models
from ..templating import templates

router = APIRouter()


def _render(request: Request, study_id: int):
    with db.get_db() as conn:
        tags = models.tags_for_study(conn, study_id)
    return templates.TemplateResponse(
        request, "partials/study_tags.html",
        {"s": {"id": study_id}, "tags": tags, "categories": models.TAG_CATEGORIES},
    )


@router.post("/study/{study_id}/tags", response_class=HTMLResponse)
def add(request: Request, study_id: int, name: str = Form(...),
        category: str = Form("outro")):
    with db.get_db() as conn:
        models.add_tag(conn, study_id, name, category)
    return _render(request, study_id)


@router.post("/study/{study_id}/tags/{tag_id}/remove", response_class=HTMLResponse)
def remove(request: Request, study_id: int, tag_id: int):
    with db.get_db() as conn:
        models.remove_tag(conn, study_id, tag_id)
    return _render(request, study_id)
