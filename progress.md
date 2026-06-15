# Progresso — draw-study

Log vivo do desenvolvimento. Atualizar ao fim de cada fase/etapa.
Spec em `documents/`. Instruções em `CLAUDE.md`.

## Estado atual
**TODAS as fases (0-6) concluídas + redesign tema claro aplicado. App completo.**

| Fase | Descrição | Status |
|------|-----------|--------|
| Docs | Visão, RF/RNF, arquitetura, modelo de dados, features, roadmap | ✅ concluído |
| 0 | Setup (esqueleto FastAPI+HTMX, schema, config vault) | ✅ concluído |
| 1 | Indexação + Biblioteca (MVP) | ✅ concluído |
| 2 | Tags + Busca + Coleções | ✅ concluído |
| 3 | Notas + Grafo | ✅ concluído |
| 4 | Planner | ✅ concluído |
| 5 | Timeline + Dashboard | ✅ concluído |
| 6 | Extras (deck/timer, refs, relatório, anotações) | ✅ concluído |
| UI | Redesign tema claro (Obsidian/Notion) + âmbar | ✅ concluído |
| 6 | Extras | ⬜ pendente |

## Próximo passo
**v2 = app desktop Tauri (Rust + SolidJS), planner-cêntrico.** Spec autoritativa em
`documents/07-v2-conceito-e-requisitos.md`; arquitetura em `documents/06-tauri-arquitetura.md`.

Descoberta concluída (6 rodadas de perguntas). Núcleo: tela **"Hoje"** dirigida por **planos**
(pasta+subpastas no vault) com **template semanal**; consistência por **meta/streak semanal**;
concluir = anexar estudo + nota + tempo. Vault **read-write** (cria pastas, importa, move).

MVP v2: M1 rotina → M2 biblioteca+import → M3 evolução → M4 conhecimento → M5 extras.

**Plano agêntico pronto** (Claude/Gemini): `AGENTS.md` (contrato), `GEMINI.md` (pointer),
`documents/08-plano-desenvolvimento-agentes.md` (backlog M0-M5 em tickets com aceite/verificação +
grafo de dependências). Agente pega 1 ticket por vez, segue DoD, atualiza este arquivo.
Próximo ticket: **M0-T1** (npm install + tauri dev).

Scaffold Tauri (`tauri/`, template solid-ts) criado mas **pausado** p/ planejar — `npm install`
ainda não rodado. Toolchain OK (node 24, cargo 1.90).

Backlog v1 (se voltar): file-watch, multi-vault, FTS5, render `.clip`, toggle claro/escuro.

> Nota de ambiente: **uv não instalado** na máquina. Em uso `.venv` + pip (ver README, seção fallback).
> Deps instaladas: fastapi, uvicorn[standard], jinja2, python-multipart, pillow, psd-tools, pymupdf, markdown.

---

## Histórico

### 2026-06-15 — Definição + Documentação
- Sessão de perguntas (analista) concluída: ferramenta pessoal localhost, "Obsidian p/ estudo
  de desenho", vault raiz read-only, SQLite sem login.
- Stack fixada: Python/FastAPI + HTMX + Jinja2 + Tailwind CDN + SQLite + uv.
- Criados: `CLAUDE.md`, `documents/00..05`, `progress.md`.
- RF01-26 e RNF01-10 definidos.

### 2026-06-15 — Fase 0: Setup
- Feito: esqueleto FastAPI + Jinja2 + HTMX + Tailwind CDN; `pyproject.toml`, `.gitignore`,
  `README.md`. `app/`: `config.py`, `db.py` (schema 12 tabelas), `main.py` (rotas `/`,
  `/settings`, `POST /settings/vault`). Templates: `base/index/settings` + partial `vault_status`.
  Página "hello vault": configurar caminho com validação (existe + é pasta), read-only (RF05).
- Verificado: `.venv` criado, deps Fase 0 instaladas. Boot OK — `/`=200, `/settings`=200,
  POST vault inválido→erro, válido→salvo. DB criado com 12 tabelas; setting persiste.
- Decisões: uv ausente → fallback `.venv`+pip. Starlette novo exige `TemplateResponse(request, name, ctx)`.
- Próximo: Fase 1 (indexação + biblioteca).

### 2026-06-15 — Fase 1: Indexação + Biblioteca
- Feito: `thumbnails.py` (dispatch por formato: raster=Pillow, pdf=PyMuPDF, psd=psd-tools,
  procreate/kra=zip embutido, clip/md=placeholder; cache webp por hash). `indexer.py` (walk
  recursivo, detecção por mtime+size, hash parcial 256KB, upsert, remoção de sumidos).
  `routes/library.py` (galeria paginada, re-scan, detalhe, `/thumb`, `/file`). `templating.py`
  (Jinja compartilhado). Templates: index galeria + partials gallery/gallery_items + detail.
- Verificado (vault de teste, 5 arquivos): scan +5, recursão em subpasta OK, 3 thumbs gerados
  (png/jpg/pdf), clip/md placeholder. HTTP: `/`=200 (5 cards), `/thumb/N`=200, `/study/N`=200,
  `/file/N`=200, re-scan idempotente (unchanged). Artefatos de teste limpos; DB resetado.
- Decisões: hash parcial (size+256KB) p/ velocidade (RNF06); thumbnail cacheado por hash (dedup);
  `/file` serve original read-only via FileResponse (RF05). Load-more via HTMX (button auto-substitui).
- Próximo: Fase 2 (tags, busca, coleções).

### 2026-06-15 — Fase 2: Tags + Busca + Coleções
- Feito: `models.py` (helpers tags/coleções/busca, categorias: tecnica/tema/material/dificuldade/outro).
  `routes/tags.py` (add/remove tag por estudo, tag órfã apagada). `routes/collections.py`
  (CRUD coleção, add/remove estudo). `library.py` reescrito com `search_studies` (busca textual
  nome/título/nota + filtro formato + tag + coleção, combinados; load-more preserva filtros).
  UI: barra de busca + dropdown formato + chips de tag no index; editores de tag/coleção no detalhe;
  página Coleções. Nav ganhou "Coleções".
- Verificado: e2e (3 estudos) — add/remove tag, contagens, criar coleção, busca q/tag/coleção/fmt
  todos corretos. HTTP: `/`=200, `/?q=`=200 (1 card), `/collections`=200, `/study/N` com form,
  POST add-tag=200 (tag aparece), POST create-collection=200. Artefatos limpos; DB resetado.
- Decisões: filtros propagados na query string do load-more; tag órfã removida ao desvincular;
  busca via LIKE (FTS5 fica no backlog se volume crescer).
- Próximo: Fase 3 (notas + grafo).

### 2026-06-15 — Fase 3: Notas + Grafo
- Feito: helpers de nota em `models.py` (CRUD, `render_note_html` com wikilinks→links + markdown
  via lib `markdown` [fenced_code/tables/nl2br/attr_list], `resync_links` resolve `[[Título]]`
  em todas as notas, `backlinks`, `graph_data`). `routes/notes.py` (lista, criar, ver, editar,
  atualizar, apagar; nota vinculada a estudo via partial; `/graph` + `/graph.json`).
  Templates: `notes`, `note` (view/edit toggle + backlinks), `graph` (vis-network CDN),
  partial `study_notes`. CSS `.note-body` no base p/ markdown. Nav ganhou Notas + Grafo.
  Detalhe do estudo agora lista/cria notas vinculadas.
- Verificado: e2e — wikilinks bidirecionais (backlinks Anatomia↔Maos), render link existente +
  `.missing`, grafo 3 nós/2 arestas, update re-sincroniza links. HTTP: `/notes`=200, criar→303→
  `/note/N`, view=200 (note-body+missing), edit=200 (textarea), `/graph`=200, `/graph.json` OK,
  delete=303. Artefatos limpos; DB resetado.
- Decisões: `resync_links` re-resolve todas as notas a cada save (barato na escala pessoal) p/
  conectar links pendentes quando o alvo é criado depois. Wikilink faltante vira link vermelho
  que leva a criar a nota. Grafo via vis-network (CDN, sem build).
- Próximo: Fase 4 (planner).

### 2026-06-15 — Fase 4: Planner
- Feito: helpers em `models.py` (planos/sessões/metas CRUD, `link_session_study`,
  `toggle_session_done`, `inc_goal`). `routes/planner.py` (planos, sessões, metas + vincular
  estudo produzido). `planner.html` 3 colunas: Planos (título/técnica/objetivo/prazo), Sessões
  (data/técnica/duração, plano, concluir, thumbnails de estudos vinculados via datalist), Metas
  (alvo/período, barra de progresso, +1/−1). Nav ganhou Planner.
- Verificado: e2e — plano criado, sessão+estudo vinculado, done toggle, meta progress 5+3−1=7,
  unlink, cascade cleanup. HTTP: `/planner`=200, POST plano/sessão/meta=303, render confirma os 3.
- Decisões: vincular estudo à sessão por ID via `<datalist>` (escala pessoal); metas com
  incremento manual ±1; `session.plan_id` ON DELETE SET NULL (apagar plano preserva sessões).
- Próximo: Fase 5 (timeline + dashboard).

### 2026-06-15 — Fase 5: Timeline + Dashboard
- Feito: helpers em `models.py` (`dashboard_stats`, `studies_by_format`, `sessions_by_technique`,
  `_streak`, `heatmap` grade 53 semanas, `timeline_groups` por ano-mês, `studies_by_tag_chrono`).
  `routes/stats.py` (`/dashboard`, `/timeline`). `dashboard.html` (6 cards, heatmap estilo
  GitHub, barras por formato e por técnica). `timeline.html` (evolução por técnica antes→depois +
  estudos agrupados por mês). Nav ganhou Dashboard + Timeline.
- Verificado: e2e — streak=3 (hoje/ontem/anteontem), horas=3.0/180min, timeline por mês
  (06:1,05:1,04:2), evolução asc, heatmap 54 colunas/3 dias ativos. HTTP: `/dashboard`=200,
  `/timeline`=200. DB resetado.
- Decisões: streak conta dias consecutivos terminando hoje OU ontem; heatmap por nº de sessões/dia
  (níveis 0-4, classes literais p/ JIT do Tailwind CDN); evolução usa tags categoria `tecnica`.
- Próximo: Fase 6 (extras).

### 2026-06-15 — Fase 6: Extras + Redesign tema claro
- Feito (extras): tabelas `reference` e `annotation` (idempotente em `db.py`). Helpers em
  `models.py` (`random_studies`, refs CRUD, annotations CRUD, `report_data`). `routes/extras.py`:
  deck `/practice` + `/practice/queue.json` com timer JS e auto-advance (RF23); referências
  externas por URL no detalhe (RF24); anotações por clique na imagem, pins em % de coordenada
  (RF26); relatório de período `/report` imprimível p/ PDF (RF25). Nav: Praticar + Relatório.
- Feito (UI): redesign p/ tema claro estilo Obsidian/Notion mantendo âmbar. Script de mapeamento
  de classes Tailwind dark→light em 22 templates + ajuste de hex do `.note-body`, hovers e cor de
  fonte do grafo. Body `bg-neutral-50 text-neutral-900`, cards `bg-white`, bordas `neutral-200`.
- Verificado: e2e — refs, anotações (x/y%), deck random, relatório, cascade delete. HTTP: todas as
  10 páginas (/, dashboard, collections, notes, graph, planner, timeline, practice, report,
  settings) = 200 no tema claro. Dados do usuário preservados (init_db idempotente, sem reset).
- Decisões: relatório em HTML + `window.print()` (sem lib PDF pesada); referências por URL externa
  (vault read-only, sem upload); anotações em % p/ responsividade; file-watch fica no backlog.
- Roadmap RF01-26 completo.

---

## Template de entrada (copiar p/ cada fase)
```
### AAAA-MM-DD — Fase X: <nome>
- Feito: ...
- Decisões: ...
- Pendências/bugs: ...
- Próximo: ...
```
