"""Rotas do planner: planos (RF15), sessões (RF16/18), metas (RF17)."""
from __future__ import annotations

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from .. import db, models
from ..templating import templates

router = APIRouter()


def _overview_ctx(conn):
    return {
        "plans": models.list_plans(conn),
        "sessions": models.list_sessions(conn, limit=50),
        "goals": models.list_goals(conn),
        "studies_by_session": {
            s["id"]: models.studies_for_session(conn, s["id"])
            for s in models.list_sessions(conn, limit=50)
        },
    }


@router.get("/planner", response_class=HTMLResponse)
def planner(request: Request):
    with db.get_db() as conn:
        ctx = _overview_ctx(conn)
        # datalist de estudos p/ vincular à sessão
        ctx["studies"] = conn.execute(
            "SELECT id, filename FROM study ORDER BY id DESC LIMIT 500"
        ).fetchall()
    return templates.TemplateResponse(request, "planner.html", ctx)


# --- planos ---

@router.post("/plans")
def create_plan(title: str = Form(...), goal: str = Form(""),
                technique: str = Form(""), deadline: str = Form("")):
    with db.get_db() as conn:
        models.create_plan(conn, title, goal, technique, deadline)
    return RedirectResponse("/planner", status_code=303)


@router.post("/plan/{plan_id}/delete")
def delete_plan(plan_id: int):
    with db.get_db() as conn:
        models.delete_plan(conn, plan_id)
    return RedirectResponse("/planner", status_code=303)


# --- sessões ---

@router.post("/sessions")
def create_session(date: str = Form(...), duration_min: int | None = Form(None),
                   technique: str = Form(""), plan_id: int | None = Form(None)):
    with db.get_db() as conn:
        models.create_session(conn, date, duration_min, technique, plan_id=plan_id)
    return RedirectResponse("/planner", status_code=303)


@router.post("/session/{session_id}/done")
def toggle_done(session_id: int):
    with db.get_db() as conn:
        models.toggle_session_done(conn, session_id)
    return RedirectResponse("/planner", status_code=303)


@router.post("/session/{session_id}/delete")
def delete_session(session_id: int):
    with db.get_db() as conn:
        models.delete_session(conn, session_id)
    return RedirectResponse("/planner", status_code=303)


@router.post("/session/{session_id}/studies")
def link_study(session_id: int, study_id: int = Form(...)):
    with db.get_db() as conn:
        models.link_session_study(conn, session_id, study_id)
    return RedirectResponse("/planner", status_code=303)


@router.post("/session/{session_id}/studies/{study_id}/remove")
def unlink_study(session_id: int, study_id: int):
    with db.get_db() as conn:
        models.unlink_session_study(conn, session_id, study_id)
    return RedirectResponse("/planner", status_code=303)


# --- metas ---

@router.post("/goals")
def create_goal(description: str = Form(...), target_count: int | None = Form(None),
                period: str = Form("semanal"), plan_id: int | None = Form(None)):
    with db.get_db() as conn:
        models.create_goal(conn, description, target_count, period, plan_id)
    return RedirectResponse("/planner", status_code=303)


@router.post("/goal/{goal_id}/inc")
def inc_goal(goal_id: int, delta: int = Form(1)):
    with db.get_db() as conn:
        models.inc_goal(conn, goal_id, delta)
    return RedirectResponse("/planner", status_code=303)


@router.post("/goal/{goal_id}/delete")
def delete_goal(goal_id: int):
    with db.get_db() as conn:
        models.delete_goal(conn, goal_id)
    return RedirectResponse("/planner", status_code=303)
