# Progresso — draw-study

Log vivo do desenvolvimento. Atualizar ao fim de cada fase/etapa.
Spec em `documents/`. Instruções em `CLAUDE.md`.

## Estado atual
**v1 (FastAPI+HTMX) completa (referência). v2 (Tauri) FEATURE-COMPLETA — M0–M5 todos concluídos
em 2026-06-16** (fundação, rotina/planner, biblioteca+import, evolução, notas+grafo, extras).
Roda via `cd tauri && npm run tauri dev`. Falta só polimento + `tauri build` (instalador). Ver log abaixo.

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

### 2026-06-16 — v2 M0-T1: Bootstrap do projeto Tauri
- Feito: setup do toolchain (Rust 1.90 em C:, VS Community 2026 c/ VC Tools, WebView2, Node scoop —
  todos verificados). `npm install` em `tauri/` (78 pkgs). `npm run build` (vite, typecheck OK).
  `cargo check` em `src-tauri` OK (compilou ~30 crates Tauri em 2m06s, exit 0).
- Verificado: build frontend verde; `cargo check` exit 0; `target/` gerado em E: (projeto). Falta
  abrir janela via `npm run tauri dev` (verificação manual GUI).
- Decisões: Rust toolchain fica em C: (decisão do usuário); build output (`target/`) no projeto E:.
- Próximo: M0-T2 (Tailwind + tema claro/âmbar + layout sidebar).

### 2026-06-16 — v2 M0-T2: Tailwind + tema base + layout
- Feito: Tailwind v3 + postcss + autoprefixer (build via Vite) + `@solidjs/router`. `tailwind.config.js`
  (acento `accent.*` = âmbar), `postcss.config.js`, `src/index.css` (`@tailwind` + base claro:
  `bg-neutral-50 text-neutral-900`). `components/Sidebar.tsx` (nav 7 itens: Hoje, Biblioteca,
  Timeline, Notas, Grafo, Planos, Configurações — `<A>` c/ activeClass âmbar), `components/Layout.tsx`
  (sidebar + `<main>` outlet). `App.tsx` reescrito: `<Router root={Layout}>` + 7 rotas placeholder.
  `index.tsx` importa `index.css`.
- Verificado: `npm run build` OK (CSS 7.45kB purgado, typecheck verde); `tauri dev` sobe, janela
  mostra sidebar + conteúdo, navegação client-side troca a view (rotas reais nos tickets M1+).
- Decisões: Tailwind **v3** (estável, casa c/ arquivos do ticket) em vez do v4; usei `@solidjs/router`
  desde já (mecanismo de nav do ticket — evita signal-switch descartável). App.css do scaffold ficou
  órfão (não importado).
- Próximo: M0-T3 (plugins Tauri + SQLite migrations, schema v2 em appDataDir).

### 2026-06-16 — v2 M0-T3: Plugins Tauri + SQLite migrations
- Feito: Cargo — `tauri-plugin-sql` (feature `sqlite`), `-fs`, `-dialog`, `-notification` (opener já).
  npm — `@tauri-apps/plugin-{sql,fs,dialog,notification}`. `migrations/0001_init.sql`: schema v2
  completo (14 tabelas — study c/ `course_id`+`lesson`, tag, study_tag, note, note_link, collection,
  collection_study, reference, annotation, setting + planner v2: course, plan, plan_slot, day_log;
  sem session/goal da v1) + índices. `lib.rs`: registra os 4 plugins + `add_migrations("sqlite:draw-study.db", …)`.
  `capabilities/default.json`: permissões sql/fs/dialog/notification. `src/lib/db.ts`: `getDb`
  (singleton), `select`/`execute` tipados, `countTables`. `App.tsx` loga nº de tabelas no boot.
- Verificado: `npm run build` OK; `cargo check` OK (exit 0, compila sqlx/sql plugin, 1m32s);
  `tauri dev` sobe → DB criado em `%APPDATA%\com.brconnect.tauri\draw-study.db` (+ WAL); contagem
  via python = **14 tabelas** de usuário + `_sqlx_migrations` (migration aplicada).
- Decisões: DB em appConfig/Roaming do identifier (`com.brconnect.tauri`), isolado do vault. Planner
  v2 substitui plan/session/goal da v1 (conforme doc 06). `greet` do scaffold mantido (smoke).
- Próximo: M0-T4 (tela Configurações: escolher pasta do vault via dialog → salvar em `setting.vault_path`).

### 2026-06-16 — v2 M0-T4: Settings + escolher vault
- Feito: `src/lib/settings.ts` (`getSetting`/`setSetting` via db.ts — upsert `ON CONFLICT`,
  `VAULT_PATH_KEY`). `src/routes/Settings.tsx`: tela Configurações, mostra vault atual, botão
  "Escolher pasta…" → `open({directory:true})` do `tauri-plugin-dialog` → salva em `setting.vault_path`.
  `App.tsx`: rota `/config` → `Settings`. `capabilities/default.json`: `dialog:allow-open`.
- Verificado: `npm run build` OK; `cargo check` OK; `tauri dev` sobe c/ dialog plugin. Upsert de
  `setting` validado via roundtrip python (insert→A, upsert→B sem duplicar). Confirmado manual GUI:
  escolher pasta + restart mantém o vault salvo (persistência OK).
- Decisões: picker via plugin-dialog direto no front (sem command Rust `pick_vault` — ticket permitia).
- M0 (Fundação) fechado. Próximo: M1-T1 (CRUD de planos — criar/listar/ativar/arquivar).

### 2026-06-16 — v2 M1-T1: CRUD de planos
- Feito: `src/lib/plans.ts` (`Plan`, `listPlans` ativo-primeiro, `createPlan(name, weeklyGoalDays)`,
  `setPlanActive(id, active)`). `src/routes/Plans.tsx`: form (nome + meta semanal dias) + lista c/
  badge ativo/arquivado + botão Ativar/Arquivar. `App.tsx`: rota `/planos` → `Plans`.
- Verificado: `npm run build` OK (typecheck); CRUD validado via roundtrip python (cria 2, arquiva 1,
  lista ordena ativo-primeiro, cleanup). HMR carregou a UI no dev em execução.
- Decisões: arquivar = `active=0` (sem delete); ordem da lista: `active DESC, created_at DESC`.
- Próximo: M1-T2 (command Rust `create_plan_folders(plan_id)` — cria pasta+subpastas no vault).

### 2026-06-16 — v2 M1-T2: Pasta do plano no vault (Rust)
- Feito: `src-tauri/src/vault.rs` — command `create_plan_folders(vault_path, plan_name, subfolders)`:
  valida vault, sanitiza nome (bloqueia traversal/`/\:*?"<>|`), `create_dir_all` (idempotente),
  retorna caminho. Registrado em `lib.rs` (`mod vault` + invoke_handler). `src/lib/api.ts`
  (`createPlanFolders` via invoke, camelCase→snake_case). `plans.ts`: `setPlanFolder`. `Plans.tsx`:
  auto-cria pasta no submit + botão "Criar pasta" (planos sem pasta) + mostra `folder_path` + erros.
- Verificado: `npm run build` OK; `cargo check` OK; **end-to-end no app**: criados
  `E:\draws\Desenhos Draw-a-Box` e `E:\draws\Desenhos Ariel` no vault, `folder_path` gravado no DB.
- Decisões: escrita no vault só via Rust (AGENTS.md); FS direto com `std::fs` (sem precisar
  permissão de plugin-fs, que é só p/ chamadas do front); subfolders fica `[]` até M1-T3 (slots).
- Próximo: M1-T3 (template semanal — editar slots por dia-da-semana: técnica/lição/subpasta).

### 2026-06-16 — v2 M1-T3: Template semanal (slots)
- Feito: `plans.ts` — `PlanSlot`, `WEEKDAYS`, `getPlan`, `listSlots`, `addSlot`, `deleteSlot`.
  `src/routes/PlanDetail.tsx` (rota `/planos/:id`): form (dia + técnica + subpasta + lição/nota) +
  grade 7 dias (Seg..Dom) listando slots, remover por slot. `App.tsx`: rota `/planos/:id` → PlanDetail.
  `Plans.tsx`: nome do plano vira link p/ detalhe.
- Verificado: `npm run build` OK; slots validados via roundtrip python (Seg=gesture, Qua=anatomia,
  ordenado por weekday, cleanup). HMR carregou no dev.
- Decisões: "lição" mapeada p/ coluna `note` do `plan_slot` (schema não tem coluna lesson própria);
  weekday 0=Seg..6=Dom (consistente c/ schema).
- Próximo: M1-T4 (tela "Hoje" — agrega slots dos planos ativos p/ o dia-da-semana atual).

### 2026-06-16 — v2 M1-T4: Tela "Hoje"
- Feito: `src/lib/today.ts` — `currentWeekday` (JS getDay → 0=Seg..6=Dom via `(d+6)%7`),
  `todayPractices` (JOIN `plan_slot`+`plan` WHERE `active=1` AND `weekday=hoje`). `src/routes/Today.tsx`:
  cabeçalho com dia, lista de práticas (técnica/plano/subpasta/nota), empty-state "🌿 Dia de descanso"
  c/ link p/ Planos. `App.tsx`: rota `/` → `Today` (era placeholder).
- Verificado: `npm run build` OK; query validada via python (hoje=terça/weekday 1; retorna só slot do
  dia, exclui outro dia; respeita `active=1`; cleanup). Mapeamento weekday JS↔schema confere.
- Decisões: agrega todos os planos ativos (ordem por nome do plano); marcar-feito/day_log fica M1-T5.
- Próximo: M1-T5 (concluir prática → `day_log` done + nota rápida + minutos).

### 2026-06-16 — v2 M1-T5: Concluir prática (day_log)
- Feito: `src/lib/logs.ts` — `DayLog`, `todayDate` (data local YYYY-MM-DD), `logsForDate`,
  `logDone(plan,slot,date,note,min)`, `undoLog(slot,date)`. `Today.tsx` reescrito: sub-componente
  `PracticeItem` c/ inputs opcionais (min + nota rápida) + botão marcar feito (✓), risca/linha ao
  concluir, botão desfazer, contador "X/Y feito". Carrega práticas + logs do dia juntos.
- Verificado: `npm run build` OK; `day_log` validado via python (logDone grava done/nota/min, undo
  remove, cleanup). HMR no dev.
- Decisões: "feito" = existe `day_log` p/ (slot_id, hoje); risca em vez de sumir (mostra progresso);
  data local (não `toISOString` UTC) p/ não trocar de dia à noite.
- Bugfix UX (não-ticket): Plans.tsx ganhou botão "Abrir" + nome em âmbar (link p/ PlanDetail não era
  óbvio — usuário não achava o grid semanal). Ver [[tauri-dev-restart-port]] p/ gotcha de restart.
- Próximo: M1-T6 (meta semanal + streak — painel "semana X/Y" + streak de semanas).

### 2026-06-16 — v2 M1-T6: Meta + streak semanal (M1 fechado)
- Feito: `src/lib/consistency.ts` — `mondayOf` (semana Seg-início), `weeklyGoal` (SUM
  weekly_goal_days dos planos ativos), `consistency()` (bucket de dias distintos com log por semana
  + streak de semanas consecutivas batendo meta; semana atual em andamento não quebra streak).
  `src/components/WeekStatus.tsx`: painel "Semana X/Y dias" + barra + "🔥 N semanas", re-fetch via
  prop `refresh`. Montado no topo de `Today.tsx` (version++ no reload → atualiza ao concluir/desfazer).
- Verificado: `npm run build` OK; algoritmo de streak validado via python em 3 cenários (meta batida
  2 semanas seguidas→streak 2; semana atual incompleta não quebra; 1 semana isolada→streak 1).
- Decisões: meta = soma dos planos ativos **limitada a 7** (`min(soma,7)`) — X conta dias distintos
  com prática (máx 7/semana), somar metas cruas estourava (ex: 4 planos = 18); streak conta semana
  atual só se já bateu, mas não quebra se ainda em andamento; semana começa na segunda (weekday 0=Seg).
- **M1 (núcleo da rotina) completo:** T1 planos · T2 pasta vault · T3 slots · T4 Hoje · T5 day_log ·
  T6 meta/streak. App entrega a rotina utilizável (planner-cêntrico).
- Extra (pedido do usuário): apagar plano + pasta. `vault.rs` command `delete_plan_folder`
  (guarda: só apaga se a pasta estiver DENTRO do vault e não for o próprio vault; canonicalize +
  starts_with). `plans.ts` `deletePlan` (cascata slots; day_log.plan_id→NULL). `Plans.tsx` botão
  "Apagar" (vermelho) c/ confirm do plugin-dialog (warning, avisa que pasta+conteúdo somem
  permanentemente). `capabilities`: `dialog:allow-confirm`. cargo check + build OK.
- Próximo: M2-T1 (scan do vault em Rust — walk + hash + upsert em `study`).

### 2026-06-16 — v2 M2-T1: Scan do vault (Rust)
- Feito: `src-tauri/src/indexer.rs` — command `scan_vault(vault_path)`: walk recursivo (`walkdir`),
  filtra extensões suportadas (png/jpg/jpeg/webp/bmp/psd/clip/procreate/kra/pdf/md), hash parcial
  `sha1(size + primeiros 256KB)` (`sha1`+`hex`), devolve `Vec<StudyEntry>` (path/filename/format/
  hash/mtime/size). `src/lib/indexer.ts` — `scanVault()`: invoca o command e faz diff/upsert em
  `study` via plugin-sql (insert novos, update por hash/mtime/size, delete sumidos), title=stem.
  Botão "Indexar vault" + stats em `Settings.tsx`. Registrado em `lib.rs`.
- Verificado: build+cargo check OK; e2e no app — 4 arquivos no vault (3 suportados + 1 .txt),
  scan → 3 studies (txt ignorado, hash/size/title corretos); apaguei 1 → rescan = idempotente
  (2 inalterados) + removeu a linha do apagado. `study` reflete certo.
- Decisões: **sem rusqlite** (conflito de `libsqlite3-sys` com sqlx do plugin-sql) — Rust só
  walk+hash, o DB fica 100% no frontend via plugin-sql (dono único). Hash sempre recalculado no
  Rust (256KB é barato); diff de mudança feito no TS. Timestamps (indexed_at/created_at) no front.
- Nota: criados arquivos dummy de teste no vault (`estudo1.png`, `nota-solta.md`, `ignorar.txt`) —
  bytes falsos, não são imagens válidas (thumbnails vão cair em placeholder no M2-T2).
- Próximo: M2-T2 (thumbnails em Rust por formato → cache em appDataDir/thumbs).

### 2026-06-16 — v2 M2-T2: Thumbnails (Rust)
- Feito: `src-tauri/src/thumbnails.rs` — command `generate_thumbnail(study_path, format, hash)`:
  dispatch por formato (raster png/jpg/jpeg/webp/bmp→`image`; procreate→zip `QuickLook/Thumbnail.png`;
  kra→zip `mergedimage.png`/`preview.png`; psd→`psd` crate→RGBA; clip/md/pdf→None/placeholder),
  resize `thumbnail(400,400)`, salva PNG em appDataDir/thumbs/<hash>.png (reusa cache se existe).
  `api.ts` `generateThumbnail`; `indexer.ts` `generateMissingThumbnails` (UPDATE study.thumb_path);
  Settings roda após scan + mostra contagem. Crates: image 0.25, zip 8.6, psd 0.3.5.
- Verificado: build+cargo check OK; e2e — PNG real (600x400) → thumb 400x267 em cache + thumb_path
  no DB; arquivos dummy (bytes falsos) e .md → None (placeholder, degradação graciosa).
- Decisões: saída **PNG** (não webp — `image` não encoda webp confiável); **PDF adiado**
  (pdfium-render exige lib nativa bundled, risco do doc 06) → cai em placeholder por ora;
  thumbs em app_data_dir/thumbs. Ainda sem galeria → thumbs só no cache até M2-T3.
- Próximo: M2-T3 (galeria + detalhe — grid de thumbnails via `convertFileSrc`, busca/filtro).

### 2026-06-16 — v2 M2-T3: Galeria + detalhe
- Feito: `src/lib/studies.ts` — `Study`, `listStudies({search,format})` (LIKE filename/title + filtro
  formato), `getStudy`, `distinctFormats`, set `RASTER`. `components/Gallery.tsx` — grid responsivo
  de cards (thumb via `convertFileSrc` ou placeholder com o formato), link p/ detalhe. `routes/
  Library.tsx` (`/biblioteca`) — busca + select de formato + Gallery (createResource reativo).
  `routes/StudyDetail.tsx` (`/biblioteca/:id`) — imagem cheia (raster=original via convertFileSrc,
  senão thumb/placeholder) + metadados (arquivo/formato/tamanho/criado/caminho) + "Abrir no app
  padrão" (`openPath` do plugin-opener). `App.tsx`: rotas wired. Janela 1100x740, título draw-study.
- Config: `tauri.conf.json` habilita `assetProtocol` (scope `**` — app pessoal, vault em qualquer
  lugar); capability `opener:allow-open-path`.
- Verificado: build + cargo check OK; app sobe. (Visual a confirmar no app: galeria mostra a PNG real
  com thumb + dummies como placeholder.)
- Decisões: `convertFileSrc` (asset protocol) p/ thumb/original, sem rota HTTP nem base64; busca MVP
  via LIKE.
- Extra (pedido do usuário): `.md` renderizado como markdown no detalhe (não placeholder). Command
  Rust `read_text_file(path)`; `markdown-it` (html:false) no front; `@tailwindcss/typography` (classe
  `prose`) p/ estilizar. StudyDetail mostra markdown renderizado quando format=md, imagem caso
  contrário. (markdown-it/prose serão reusados nas Notas/M4.)
- Próximo: M2-T4 (importar arrastando → pasta do plano via command Rust `import_study`).

### 2026-06-16 — v2 M2-T4: Importar → pasta do plano
- Feito: `src-tauri/src/vault.rs` command `import_study(vault_path, dest_folder, src_path)` — COPIA
  o arquivo p/ a pasta (guarda: destino dentro do vault; `unique_path` sufixa `(1)` se colidir,
  nunca sobrescreve). `api.ts` `importStudy`. `components/DropZone.tsx`: drag-drop via
  `onDragDropEvent` (path real) + botão "Selecionar arquivos" (dialog filtrado) → escolhe plano
  (ativos c/ pasta) + subpasta → importa em lote. Montado no topo de `Library.tsx`; após importar
  roda scan+thumbnails+refetch (aparece na galeria).
- Verificado: build + cargo check OK; app sobe. (Visual a confirmar: arrastar/selecionar arquivo →
  vai p/ vault/<plano>/<subpasta> → aparece na biblioteca.)
- Decisões: **copia** (não move) — RNF/AGENTS: não apaga original sem confirmação; `move_study`
  adiado; reindex via scanVault (re-walk completo, ok p/ vault pessoal).
- Próximo: M2-T5 (tags, coleções, vínculo a curso).

### 2026-06-16 — v2 M2-T5: Tags, coleções, curso (M2 fechado)
- Feito: `lib/tags.ts` (find-or-create tag por name+category, vincular/desvincular study_tag,
  `TAG_CATEGORIES`), `lib/collections.ts` (CRUD coleção + collection_study + studiesInCollection),
  `lib/courses.ts` (listar/criar curso + `setStudyCourse`). `StudyDetail` ganhou `<StudyEditors>`:
  tags (chips+add por categoria), coleções (chips+add existente/criar nova), curso+lição (select+
  salvar/criar). `studies.ts listStudies`: busca casa tag (EXISTS) + filtro `collectionId`.
  `Library`: placeholder "nome ou tag" + filtro de coleção. Nova rota `/colecoes` (`Collections.tsx`:
  criar/apagar coleção + ver estudos via Gallery) + item "Coleções" no Sidebar.
- Verificado: `npm run build` OK; SQL validado via python (busca por tag acha; coleção lista certo;
  curso/lição gravam; cleanup). HMR no dev.
- Decisões: tag única por (name,category); apagar coleção = cascade collection_study (não toca
  vault/estudos); curso/lição em colunas do próprio `study`.
- **M2 (Biblioteca + import) completo:** T1 scan · T2 thumbnails · T3 galeria/detalhe · T4 import ·
  T5 tags/coleções/curso. Mais extras: .md renderizado, apagar plano+pasta.
- Próximo: M3-T1 (timeline contínua — scroll cronológico agrupado por mês).

### 2026-06-16 — v2 M3: Timeline + Dashboard (M3 fechado)
- M3-T1 (Timeline): `lib/timeline.ts` (`timelineStudies` + filtro por técnica, `groupByMonth` com
  rótulo PT, `techniqueTags`). `routes/Timeline.tsx` (`/timeline`): filtro de técnica + seções por
  mês (header sticky) reusando `<Gallery>`. Rota wired.
- M3-T2 (Dashboard): `lib/stats.ts` (`dashboardStats` = nº estudos + min total + consistency;
  `logHeatmap` mapa date→count; `studiesByTechnique`). `routes/Dashboard.tsx` (`/painel`): 4 cards
  (streak/semana/horas/estudos) + heatmap 53 semanas (níveis âmbar) + barras por técnica. Item
  "Painel" no Sidebar.
- Verificado: `npm run build` OK (T1+T2); stats validados via python (estudos, 45min, heatmap por
  dia, por técnica). HMR no dev.
- Decisões: timeline filtra por tag categoria 'tecnica'; horas = SUM(duration_min)/60 dos day_log
  feitos; heatmap reusa `mondayOf`+`todayDate`, classes âmbar literais (JIT do Tailwind).
- Próximo: M4-T1 (notas markdown + wikilinks/backlinks).

### 2026-06-16 — v2 M4-T1: Notas markdown + wikilinks/backlinks
- Feito: `lib/notes.ts` — CRUD (`listNotes`/`getNote`/`createNote`/`updateNote`/`deleteNote`),
  `parseWikilinks`, `updateNote` re-sincroniza `note_link` (resolve `[[Título]]`→id case-insensitive,
  regrava src), `backlinks`. `routes/Notes.tsx` (`/notas`): lista + criar (navega ao detalhe).
  `routes/NoteDetail.tsx` (`/notas/:id`): editor (título + textarea md) + preview markdown-it com
  `[[Título]]`→link `/notas/:id` (resolvido) clicável (solid-router intercepta), backlinks, salvar/
  apagar. Rotas wired (Notas já no Sidebar).
- Verificado: `npm run build` OK; wikilink/backlink validados via python (A→[[B]] gera backlink em B;
  cascade limpa note_link). HMR no dev.
- Decisões: link só se a nota-alvo existe (senão texto puro); preview em coluna lado-a-lado com o
  editor; `prose` (typography) reusa o de M2.
- Extra: campo **Data do estudo** editável no detalhe (`setStudyDate` → `study.created_at`); padrão
  = mtime do arquivo, alimenta Timeline/Painel. Bugfix Timeline: `createResource` com source
  `undefined` desliga a busca no Solid → troquei p/ source objeto sempre-truthy (`{tech}`).
- Próximo: M4-T2 (grafo de notas — nós/arestas de note_link, clique navega).

### 2026-06-16 — v2 M4-T2: Grafo de notas (M4 fechado)
- Feito: `notes.ts` `allLinks()` (arestas note_link). `routes/Graph.tsx` (`/grafo`): grafo SVG
  custom — layout circular dos nós (notas), linhas = note_link, clique no nó navega p/ `/notas/:id`.
  Rota wired (Grafo já no Sidebar).
- Verificado: `npm run build` OK; dados reusam note/note_link (validados no M4-T1).
- Decisões: **SVG custom** em vez de vis-network/cosmos — grafo de notas é pequeno, evita dep pesada
  (AGENTS: leve). Layout circular simples (sem física); pode evoluir depois se necessário.
- **M4 (Conhecimento):** T1 notas+wikilinks+backlinks · T2 grafo. (T3 abaixo.)

### 2026-06-16 — v2 M4-T3: Referências + anotações na imagem (M4 fechado)
- Feito: `lib/refs.ts` (CRUD `reference` URL+legenda; CRUD `annotation` x/y em %).
  `components/ReferenceList.tsx` (lista refs, abrir via `openUrl`, add/remover) montado no StudyEditors.
  `components/ImageAnnotator.tsx` (substitui `<img>` no detalhe): clique na imagem cria pin pendente
  c/ input → grava x%,y%; pins existentes clicáveis (mostra texto + remover); posição em % =
  responsiva. `capabilities`: `opener:allow-open-url`.
- Verificado: build + cargo check OK; refs/anotações validadas via python (URL+legenda; x=42.5/y=68%).
- Decisões: anotação em coordenada % (responsiva ao redimensionar); refs por URL externa (vault
  read-write controlado, sem upload); pin via input inline (sem window.prompt).
- **M4 (Conhecimento) completo:** T1 · T2 · T3.
- Próximo: M5 (extras) — T1 deck+timer · T2 relatório · T3 notificação diária.

### 2026-06-16 — v2 M5-T1: Deck de sorteio + timer
- Feito: `lib/practice.ts` `randomStudies(count, techniqueTagId?)` (raster `ORDER BY RANDOM()`,
  filtro por técnica via study_tag). `routes/Practice.tsx` (`/praticar`): setup (técnica + qtd +
  tempo 30s/1m/2m/5m) → sessão com imagem (`convertFileSrc`), contagem regressiva + auto-advance,
  controles anterior/pausar/pular/encerrar, contador X/Y. Item "Praticar" no Sidebar.
- Verificado: `npm run build` OK; query raster validada via python (só raster, .md fora).
- Decisões: timer client-side (`setInterval`, limpo no onCleanup); deck via plugin-sql (sem command
  Rust `random_studies`); fim do deck encerra a sessão.
- Extra: deck agora filtra por **qualquer tag** (não só técnica) — `listTags` no dropdown
  (`categoria: nome`); fluxo: taguear na Biblioteca → sortear por tag em Praticar.

### 2026-06-16 — v2 M5-T2 + M5-T3: Relatório + Notificação (M5 fechado, v2 feature-completa)
- M5-T2 (Relatório): `lib/report.ts` `reportData(start,end)` (dias praticados, horas, estudos
  criados, por técnica — ranges em day_log.date e date(study.created_at)). `routes/Report.tsx`
  (`/relatorio`): range de datas (default mês atual→hoje) + cards + tabela por técnica + "Imprimir/
  PDF" (`window.print()`). CSS `@media print { .no-print }` + sidebar marcada `no-print`.
- M5-T3 (Notificação): `lib/notify.ts` (`ensurePermission`, `sendReminder`, `startReminderLoop`
  checa horário a cada 30s enquanto app aberto, 1x/dia). Settings: ativar + horário + "Testar".
  `App` inicia o loop no boot. `capabilities`: notification allow-notify/is-permission-granted/
  request-permission. Itens "Praticar"/"Relatório" no Sidebar.
- Verificado: build + cargo check OK; relatório validado via python (dias/min/estudos no range).
- Decisões: lembrete é "enquanto app aberto" (agendamento OS com app fechado fica fora de escopo);
  relatório imprime via webview (sem lib PDF), igual v1.
- **🎉 v2 feature-completa: M0 (fundação) · M1 (rotina) · M2 (biblioteca/import) · M3 (evolução) ·
  M4 (conhecimento) · M5 (extras).** Extras: .md renderizado, apagar plano+pasta, data editável,
  deck por tag.
- Próximo (pós-MVP): polimento, ícone/título do app, `npm run tauri build` (instalador), revisar
  escopo do asset protocol (`**`), tratar overwrite de created_at no rescan, PDF thumbnails (pdfium).

### 2026-06-16 — v2 M6: Melhorias pós-MVP (feedback do usuário)
- M6-T1: removido "Praticar" (rota/sidebar/Practice.tsx/practice.ts).
- M6-T2: heatmap do Painel com hover → mostra data + nº de práticas (linha de info; sem `title`).
- M6-T3: autocomplete de `[[` nas Notas — dropdown filtrável de títulos; selecionar insere `[[Título]]`.
- M6-T4: Coleções auto-selecionam a 1ª + mostram contagem; galeria das imagens da coleção.
- M6-T5: apagar estudo na Biblioteca → confirm → **apaga arquivo do vault** (Rust `delete_file`,
  guarda dentro do vault) + `deleteStudy` (cascade tags/coleções/refs/anotações; day_log.study_id→NULL).
- M6-T6: planner funcional. Curso removido (== Plano; seção tirada do StudyDetail, colunas ficam no
  DB sem uso). **Matérias = tags.** Anexar arte à execução: tela Hoje, prática concluída → "anexar
  arte" → `import_study` p/ pasta do plano (+subpasta do slot) → scan+thumb → `day_log.study_id` →
  aparece na Biblioteca (link "ver na biblioteca"). Helpers: `today.folder_path`, `setLogStudy`,
  `getStudyByPath`.
- M6-T7: Timeline filtra por **Plano** (via day_log.study_id→plan) e/ou **qualquer tag** (2 selects).
- Verificado: `npm run build` + `cargo check` OK (T5 command Rust). Validação GUI pendente do usuário.
- Decisões: apagar = permanente (escolha do usuário); matérias = tags (sem entidade nova); attach
  reusa import_study; orphan `courses.ts` deletado.

### 2026-06-16 — v2 M6 fixes (feedback)
- **Bug attach:** `import_study` retornava caminho canonicalizado (`\\?\E:\…`) ≠ caminho do scan →
  `getStudyByPath` não casava → `day_log.study_id` nunca era setado (sem indicador). Fix: retornar
  `dest.join(filename)` (normal); canonicalize só p/ a guarda de segurança. Agora liga + mostra
  **thumbnail** da arte anexada no Hoje (não só texto). (Anexos feitos antes do fix não vincularam —
  re-anexar.)
- **Coleções UX:** chips agora só selecionam (sem X que apagava por engano); apagar virou botão
  "Apagar coleção" dedicado, com confirm, ao lado da galeria. Mostra "<nome> · N imagens".

### 2026-06-16 — v2 Redesign: tema escuro customizado (vibe toile/engraving)
- Feito: tema **dark** + acento **azul-cobalto** (`#4a5cf5`) + **títulos serifados** + bold/expressivo
  (referência: Social Impact Capital). `tailwind.config.js`: escala accent azul + tokens semânticos
  (`bg/surface/surface2/line/ink/muted/faint`) + `fontFamily.serif`. `index.css`: body dark, h1/h2/h3
  serif, `::selection` azul, scrollbar discreta. Sweep (perl) em ~18 .tsx: classes claras→tokens
  escuros (bg-white→surface, neutral-*→ink/muted/faint/line, accent-50→accent-500/10, links→accent-300,
  amber/red→variantes dark). Markdown com `prose-invert`. Grafo: nós azul + stroke/fill p/ escuro.
- Verificado: `npm run build` OK; app sobe no escuro.
- Decisões: tema dark-only por ora (tokens já prontos p/ futuro toggle); serifa só nos títulos;
  sem ornamentos toile (peso). Iterar conforme feedback (intensidade do azul, fundo, serifa no corpo).

### 2026-06-16 — v2 Fixes & Biblioteca Improvements
- Feito: importação de `execute` em `src/lib/studies.ts` para corrigir a falha silenciosa na deleção de estudos (ReferenceError).
- Feito: estilização de vários inputs e selects em `Report.tsx`, `Today.tsx`, `Settings.tsx`, `StudyDetail.tsx`, `ImageAnnotator.tsx`, `ReferenceList.tsx` e `Collections.tsx` adicionando `bg-surface text-ink` para resolver campos brancos no tema escuro.
- Feito: diminuição do tamanho dos cards da Galeria (`Gallery.tsx`) aumentando as colunas do grid.
- Feito: filtro na listagem de estudos para exibir somente o formato `.png` caso existam 2 arquivos de mesmo nome base (stem/caminho sem extensão) no mesmo local.
- Feito: implementação de Lightbox no grid de visualização da biblioteca (`Library.tsx`) com navegação por teclado (`←` e `→` / `Esc`), controles de Zoom (Scroll do mouse, duplo clique, botões +/- e indicador de porcentagem) e arrastar para mover (panning) quando ampliado.
- Feito: implementação de controles de Zoom (Scroll, duplo clique e arrastar para mover) na página de detalhes do estudo (`/biblioteca/:id` em `ImageAnnotator.tsx`), garantindo que os pins de anotação existentes e novos escalem e movam sincronizadamente com a imagem, e que cliques normais ainda adicionem anotações mesmo quando ampliado.
- Feito: filtro na query/listagem da Timeline (`timeline.ts`) para exibir apenas o formato `.png` caso existam múltiplos formatos do mesmo nome no mesmo local.
- Feito: implementação de collapsible headers na Timeline (`Timeline.tsx`) por mês, permitindo recolher/expandir seções individuais de forma reativa e adicionando botões globais "Recolher todos" e "Expandir todos".
- Feito: atualização do logotipo do aplicativo na barra lateral (`Sidebar.tsx`) e do favicon no arquivo de entrada (`index.html`) para utilizar a nova imagem `/lapis-logo.png` fornecida no diretório `public`.
- Feito: regeneração de todos os ícones nativos do sistema (incluindo o arquivo `icon.ico` da barra de tarefas do Windows e título da janela) a partir do `lapis-logo.png` usando o comando `npx tauri icon`.
- Feito: atualização do título padrão do aplicativo para `draw-study` em `index.html`.
- Verificado: `npm run build` passa (typecheck verde).

## Template de entrada (copiar p/ cada fase)
```
### AAAA-MM-DD — Fase X: <nome>
- Feito: ...
- Decisões: ...
- Pendências/bugs: ...
- Próximo: ...
```
