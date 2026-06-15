# 05 — Roadmap

Entrega incremental — cada fase deixa o app utilizável. Progresso real em `progress.md`.

## Fase 0 — Setup
- Esqueleto FastAPI + Jinja2 + HTMX + Tailwind CDN.
- `pyproject.toml` (uv), `app/main.py`, `app/db.py` (criação do schema), `config.py`.
- Página "hello vault": configurar caminho do vault e salvar em `setting`.
- **Saída:** `uv run uvicorn app.main:app` sobe em `127.0.0.1:8000`.

## Fase 1 — Indexação + Biblioteca (MVP) — RF01-06, RF10
- `indexer.py`: walk recursivo, hash+mtime, upsert em `study`.
- `thumbnails.py`: dispatch por formato (raster→PSD→PDF→procreate/kra; `.clip`=placeholder).
- Galeria em grid (HTMX infinite scroll) + página de detalhe.
- Re-scan manual com diff.
- **Saída:** apontar vault real → ver todos os desenhos com thumbnail.

## Fase 2 — Tags + Busca + Coleções — RF07-09
- CRUD de tags por categoria; atribuição a estudos.
- Busca com filtros combinados (nome + tag + nota).
- Coleções (pastas virtuais).

## Fase 3 — Notas + Grafo — RF11-14
- Notas markdown (por estudo + avulsas); render + preview de imagem.
- Wikilinks `[[...]]` + backlinks automáticos.
- Visão de grafo navegável.

## Fase 4 — Planner — RF15-18
- Planos, sessões em calendário, metas.
- Concluir sessão + vincular estudos produzidos.

## Fase 5 — Timeline + Dashboard — RF19-22
- Timeline cronológica; antes/depois por técnica.
- Dashboard (contagens, streak, horas, por técnica); heatmap.

## Fase 6 — Extras — RF23-26
- Deck de sorteio + timer (gesture drawing).
- Referências externas; export de relatório; anotações na imagem.
- File-watch (watchfiles) p/ auto-detecção.

## Backlog / ideias futuras
- Multi-vault.
- Busca FTS5.
- Render real de `.clip` (CLI/lib externa).
- Modo apresentação (slideshow de estudos por técnica).
- Atalhos de teclado.
- Tema claro/escuro.

## Prioridade resumida
**MVP = Fases 0-1.** Depois 2 → 3 (maior valor "Obsidian") → 4 → 5 → 6.
