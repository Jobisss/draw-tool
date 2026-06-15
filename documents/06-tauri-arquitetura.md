# 06 — Arquitetura Tauri (plano da v2)

> Decisão: migrar de FastAPI+HTMX (v1, fica como referência) p/ **app desktop Tauri**.
> Reusa: `00-visao-geral`, `01-requisitos` (RF01-26/RNF), `04-features`, `05-roadmap`, e o
> **schema SQLite** de `03-modelo-dados` (SQL idêntico). Muda só backend + frontend.

## Stack v2
| Camada | Escolha | Nota |
|--------|---------|------|
| Shell | **Tauri 2** | app nativo, 1 binário/instalador, webview do SO |
| Backend | **Rust** (commands IPC) | scan + thumbnails + acesso a arquivos |
| Frontend | **SolidJS + Vite + TypeScript** | reativo, leve, pouco boilerplate |
| Estilo | **Tailwind** (via Vite, com build) | agora há build-step real (não CDN) |
| DB | **SQLite** via `tauri-plugin-sql` | mesmo schema da v1 |
| FS / pastas | `tauri-plugin-fs` + `tauri-plugin-dialog` | picker do vault, leitura |
| Abrir original | `tauri-plugin-opener` | abre arquivo no app padrão do SO |
| Imagens (webview) | `convertFileSrc` (asset protocol) | servir thumb/original sem rota HTTP |

### Crates Rust (imagem/indexação)
- `walkdir` — varrer o vault recursivo.
- `image` — thumbnails de raster (png/jpg/webp/bmp). ✅
- `zip` — `.procreate` (`QuickLook/Thumbnail.png`) e `.kra` (`mergedimage.png`). ✅
- `psd` — preview de `.psd` (parcial). ⚠️
- `pdfium-render` — 1ª página de PDF (requer lib pdfium no build). ⚠️
- `.clip` — sem solução confiável → placeholder (igual v1).
- `sha1`/`blake3` — hash parcial p/ detecção de alteração.

## Estrutura do projeto
```
draw-study-tauri/
├── src/                      # SolidJS (frontend)
│   ├── routes/               # Library, Detail, Notes, Graph, Planner, Timeline, Practice, Report, Settings
│   ├── lib/db.ts             # wrapper tauri-plugin-sql (queries)
│   ├── lib/api.ts            # invoke() dos commands Rust
│   ├── components/           # Gallery, TagEditor, Heatmap, etc.
│   └── App.tsx
├── src-tauri/                # Rust (backend)
│   ├── src/
│   │   ├── lib.rs            # registro de commands + plugins
│   │   ├── indexer.rs        # scan_vault (walk + hash + upsert)
│   │   ├── thumbnails.rs     # dispatch por formato → cache
│   │   └── db.rs             # migrations (schema da v1)
│   ├── tauri.conf.json
│   └── Cargo.toml
└── documents/                # esta spec (compartilhada)
```

## Divisão de responsabilidade
- **Rust commands** (trabalho pesado / FS): `scan_vault`, `generate_thumbnail`, `pick_vault`
  (dialog), `rescan`. Retornam estatísticas/paths.
- **tauri-plugin-sql** (CRUD leve, direto do frontend): tags, coleções, notas, planos, sessões,
  metas, referências, anotações, settings — evita escrever um command por operação.
- **Frontend SolidJS**: estado reativo, roteamento, render. Timer do deck (RF23) e pins de
  anotação (RF26) já eram client-side na v1 → portam quase diretos.

### Mapa: rotas v1 → v2
| v1 (FastAPI) | v2 |
|---|---|
| `GET /` galeria | query SQL no frontend + `<Gallery>` |
| `POST /rescan` | command `rescan` (Rust) |
| `GET /thumb/{id}` | `convertFileSrc(thumb_path)` |
| `GET /file/{id}` | `convertFileSrc(study.path)` / `opener` |
| CRUD tags/notas/planner | `tauri-plugin-sql` execute/select |
| `GET /graph.json` | query SQL → vis-network/`@cosmograph` no frontend |

## Migração do schema
Base de `03-modelo-dados.md` (study, tag, note, collection, reference, annotation, setting) roda
como **migration** do `tauri-plugin-sql`. **v2 revisa o planner** (ver `07-v2-...`):

```sql
-- núcleo da rotina (substitui plan/session/goal da v1)
CREATE TABLE plan (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL,
  folder_path TEXT,            -- pasta do plano no vault
  weekly_goal_days INTEGER,    -- meta semanal (ex: 5)
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE TABLE plan_slot (       -- template semanal recorrente
  id INTEGER PRIMARY KEY, plan_id INTEGER REFERENCES plan(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,    -- 0=seg .. 6=dom
  technique TEXT, subfolder TEXT, note TEXT
);
CREATE TABLE day_log (         -- registro diário (fiz/não fiz + anexos)
  id INTEGER PRIMARY KEY, plan_id INTEGER REFERENCES plan(id) ON DELETE SET NULL,
  slot_id INTEGER REFERENCES plan_slot(id) ON DELETE SET NULL,
  date TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 1,
  study_id INTEGER REFERENCES study(id) ON DELETE SET NULL,
  quick_note TEXT, duration_min INTEGER, created_at TEXT NOT NULL
);
CREATE TABLE course (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
-- study ganha: course_id INTEGER NULL, lesson TEXT NULL
```

## Escrita no vault (RNF-3 revisado)
v2 é **read-write controlado** — Rust commands fazem as operações de FS:
- `create_plan_folders(plan)` — cria pasta + subpastas no vault.
- `import_study(src, plan_id, subfolder)` — move/copia arquivo p/ a pasta do plano, indexa.
- `move_study(study_id, dest)` / `rename_study(...)` — organizar.
- **Nunca apaga** original sem confirmação explícita; mover é logado p/ permitir desfazer.

## Roadmap v2 (reaproveita fases da v1)
- **T0 — Scaffold**: `create-tauri-app` (SolidJS+TS), Tailwind, plugin-sql + migrations, picker de vault.
- **T1 — Indexação + Biblioteca**: `scan_vault` + `thumbnails` (raster→zip→psd→pdf), galeria, detalhe.
- **T2 — Tags/Busca/Coleções**: CRUD via plugin-sql.
- **T3 — Notas + Grafo**: markdown (`markdown-it`), wikilinks/backlinks, grafo no frontend.
- **T4 — Planner**; **T5 — Timeline/Dashboard**; **T6 — Extras** (deck/timer, refs, relatório, anotações).
- Lógica de cada fase já validada na v1 → portar, não redesenhar.

## Riscos / decisões em aberto
- **pdfium**: distribuir a lib junto (tamanho do bundle) ou tornar PDF opcional no T1.
- **psd**: crate cobre PSD comum; PSB/efeitos podem falhar → fallback placeholder.
- **Markdown render**: `markdown-it` no frontend (substitui lib `markdown` do Python).
- **Estilo do relatório/PDF**: sem `window.print` nativo bonito — avaliar export via Rust/printpdf
  ou print do webview.
- **Distribuição**: assinar/instalar no Windows (MSI/NSIS via Tauri bundler).

## O que muda vs v1
- Eixo: **planner-cêntrico** (tela "Hoje" dirige o app) — ver `07-v2-conceito-e-requisitos.md`.
- Vault **read-write** (era read-only): app cria pastas, importa, move/renomeia (RNF-3).
- Planner reescrito: `plan`+`plan_slot` (template semanal) + `day_log`; consistência por **meta
  semanal/streak semanal** (não mais sessões avulsas + goals manuais).
- "localhost" → "app local"; "sem build-step" cai (Tauri tem build).

## O que NÃO muda
Biblioteca/indexação/thumbnails, tags, busca, coleções, notas+grafo, referências, anotações,
timeline, deck/timer, relatório — conceito e fluxo herdados da v1.
