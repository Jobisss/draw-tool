"""draw-study — app FastAPI. Localhost only (RNF01)."""
from pathlib import Path

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from . import config, db
from .routes import collections, extras, library, notes, planner, stats, tags
from .templating import templates

app = FastAPI(title="draw-study")

config.STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=config.STATIC_DIR), name="static")

app.include_router(library.router)
app.include_router(tags.router)
app.include_router(collections.router)
app.include_router(notes.router)
app.include_router(planner.router)
app.include_router(stats.router)
app.include_router(extras.router)


@app.on_event("startup")
def _startup() -> None:
    db.init_db()


@app.get("/settings", response_class=HTMLResponse)
def settings(request: Request):
    vault = db.get_setting("vault_path")
    return templates.TemplateResponse(
        request, "settings.html", {"vault": vault, "msg": None}
    )


@app.post("/settings/vault", response_class=HTMLResponse)
def save_vault(request: Request, vault_path: str = Form(...)):
    """Salva o caminho do vault (RF01). Valida que existe; nunca escreve nele (RF05)."""
    p = Path(vault_path.strip().strip('"'))
    if not p.exists() or not p.is_dir():
        msg = ("error", f"Caminho inválido ou não é pasta: {vault_path}")
    else:
        db.set_setting("vault_path", str(p))
        msg = ("ok", f"Vault salvo: {p}")
    return templates.TemplateResponse(
        request,
        "partials/vault_status.html",
        {"vault": db.get_setting("vault_path"), "msg": msg},
    )
