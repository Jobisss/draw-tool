# draw-study

"Obsidian focado em estudo de desenho" — ferramenta pessoal, localhost, single-user.
Aponta para uma pasta-cofre (vault), indexa desenhos e oferece biblioteca, notas, planner e timeline.

Spec completa em [`documents/`](documents/). Progresso em [`progress.md`](progress.md).

## Stack
Python 3.12+ · FastAPI · HTMX · Jinja2 · Tailwind (CDN) · SQLite · Pillow/psd-tools/PyMuPDF.

## Rodar

### Com uv (recomendado)
```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Com venv + pip (fallback)
```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Abrir: http://127.0.0.1:8000 → **Configurações** → informar o caminho do vault.

## Regras
- **Read-only** no vault: o app nunca move/altera seus arquivos.
- **Localhost only**: bind em `127.0.0.1`.
- Dados do app (DB + thumbnails) ficam em `data/` (gitignored), fora do vault.

## Status
Fase 0 (setup) concluída. Fase 1 (indexação + biblioteca) a seguir — ver `documents/05-roadmap.md`.
