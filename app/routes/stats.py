"""Rotas de dashboard (RF21/22) e timeline / antes-depois (RF19/20)."""
from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from .. import db, models
from ..templating import templates

router = APIRouter()


@router.get("/dashboard", response_class=HTMLResponse)
def dashboard(request: Request):
    with db.get_db() as conn:
        ctx = {
            "stats": models.dashboard_stats(conn),
            "by_format": models.studies_by_format(conn),
            "by_technique": models.sessions_by_technique(conn),
            "heatmap": models.heatmap(conn),
        }
    return templates.TemplateResponse(request, "dashboard.html", ctx)


@router.get("/timeline", response_class=HTMLResponse)
def timeline(request: Request, tech: int | None = None):
    with db.get_db() as conn:
        ctx = {
            "groups": models.timeline_groups(conn),
            "technique_tags": models.technique_tags(conn),
            "tech": tech,
            "evolution": models.studies_by_tag_chrono(conn, tech) if tech else None,
        }
    return templates.TemplateResponse(request, "timeline.html", ctx)
