# draw-study — instruções do projeto

> **Agentes (Claude/Gemini): leia `AGENTS.md` primeiro.** Ele é o contrato de desenvolvimento
> da v2 (stack, regras, ordem de docs, backlog em `documents/08-...`). Este CLAUDE.md descreve a
> v1 (referência). A v2 (Tauri) é o alvo atual — ver `AGENTS.md` + `documents/07-v2-...`.


## O que é
Ferramenta **pessoal, single-user, localhost-only**: um "Obsidian focado em estudo de desenho".
Aponta para uma **pasta-cofre (vault)** com desenhos locais, indexa tudo, e oferece
biblioteca com tags, notas vinculadas (grafo), planner de estudos e timeline de progresso.

Especificação completa em **`documents/`**. Estado do desenvolvimento em **`progress.md`**.

## Stack (fixada)
- **Python 3.12 + FastAPI** (backend, serve HTML).
- **Jinja2** (templates server-side, sem build).
- **HTMX** (interatividade parcial, sem SPA).
- **Tailwind via CDN** (estilo, sem build-step).
- **SQLite** (persistência local, arquivo único).
- **Pillow** (raster), **psd-tools** (.psd), **PyMuPDF/fitz** (PDF), **zipfile** stdlib (.procreate/.kra).
- **uv** (gerência de dependências e run).

## Comandos (planejados — código ainda não existe)
```bash
uv sync                                          # instalar deps
uv run uvicorn app.main:app --reload --port 8000 # rodar (http://127.0.0.1:8000)
```

## Regras invioláveis
- **READ-ONLY no vault** (RNF04): NUNCA mover, renomear ou alterar arquivos do usuário no vault.
- **Localhost only** (RNF01): bind em `127.0.0.1`, sem exposição externa.
- **Sem auth** (RNF02): single-user, sem login.
- Dados do app (DB + thumbnails cache) ficam **isolados do vault**, em `data/` (ou `~/.draw-study/`).
- **Leve acima de tudo** (RNF03): evitar build-step JS, dependências pesadas, abstrações desnecessárias.

## Convenções
- Código simples e legível (projeto solo). Português nos docs; código/identificadores em inglês.
- Rotas HTMX retornam **partials** Jinja2; navegação completa retorna página inteira.
- Thumbnails gerados sob demanda e cacheados; fallback p/ placeholder se formato não suportado.
- Cada fase concluída → atualizar `progress.md`.

## Documentação (ler antes de codar)
- `documents/00-visao-geral.md` — problema, objetivo, escopo.
- `documents/01-requisitos.md` — RF (RF01-26) + RNF (RNF01-10).
- `documents/02-arquitetura.md` — stack, camadas, decisões, estrutura de pastas.
- `documents/03-modelo-dados.md` — schema SQLite + DDL.
- `documents/04-features.md` — detalhe e fluxo de cada feature.
- `documents/05-roadmap.md` — fases 0-6 e backlog.

## Status atual
v1 (FastAPI+HTMX) **completa** — todas as fases 0-6 + tema claro. Roda via `.venv` (uv ausente).

**Decisão atual:** planejando migração p/ **app desktop Tauri** (Rust + SolidJS) — v1 vira
referência. Plano em `documents/06-tauri-arquitetura.md`. Codar v2 depois. Ver `progress.md`.
