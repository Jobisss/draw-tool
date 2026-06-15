# 02 — Arquitetura

## Visão geral
Monólito local server-side. FastAPI serve páginas Jinja2; HTMX faz atualizações parciais sem
SPA. SQLite guarda o índice e metadados. Os arquivos de desenho **permanecem no vault**
(read-only); só thumbnails derivados são gravados, em cache isolado.

```
Browser (HTMX + Tailwind CDN)
        │  HTTP (127.0.0.1:8000)
        ▼
FastAPI ── routes ── render Jinja2 (páginas + partials)
        │
        ├── indexer  ─► varre vault, hash, popula SQLite
        ├── thumbnails ─► Pillow / psd-tools / fitz / zipfile ─► cache em disco
        └── db (SQLite)
                 │
   vault/ (READ-ONLY)        data/ (db.sqlite + thumbs/)
```

## Stack e justificativa
| Camada | Escolha | Por quê |
|--------|---------|---------|
| Backend | Python 3.12 + **FastAPI** | leve, async, ótimo p/ servir HTML + manipular arquivos |
| Templates | **Jinja2** | render server-side, zero build |
| Interatividade | **HTMX** | partials sem SPA/JS pesado |
| Estilo | **Tailwind via CDN** | sem build-step; trocável por build se crescer |
| Banco | **SQLite** (`sqlite3` stdlib) | arquivo único, zero infra |
| Imagens raster | **Pillow** | thumbnails, resize, EXIF |
| PSD | **psd-tools** | extrai preview composto |
| PDF | **PyMuPDF (fitz)** | thumbnail da 1ª página |
| .procreate/.kra | **zipfile** (stdlib) | são ZIP; extrair thumbnail embutido |
| .clip | fallback/placeholder | formato fechado, sem lib confiável |
| File watch | **watchfiles** (opcional) | detectar mudanças no vault (fase futura) |
| Deps / run | **uv** + `uvicorn` | rápido, 1 comando |

## Camadas
- **Routes** (`app/routes/`): library, notes, graph, planner, timeline, settings. Cada rota
  retorna página completa ou partial HTMX.
- **Services**: `indexer.py` (scan + hash + diff), `thumbnails.py` (dispatch por extensão).
- **Data**: `db.py` (conexão, migrations simples), `models.py` (entidades / queries).
- **Templates** (`app/templates/`): `base.html` + partials por feature.
- **Static** (`app/static/`): CSS extra e JS mínimo (htmx incluído via CDN ou vendored).

## Estrutura de pastas
```
draw-study/
├── CLAUDE.md
├── progress.md
├── README.md
├── pyproject.toml            # deps (uv)
├── documents/                # esta especificação
├── app/
│   ├── main.py               # FastAPI app + montagem de rotas
│   ├── config.py             # caminho do vault, data dir
│   ├── db.py                 # conexão/schema SQLite
│   ├── models.py             # entidades + queries
│   ├── indexer.py            # scan do vault + hash + diff
│   ├── thumbnails.py         # geração por formato
│   ├── routes/               # library, notes, graph, planner, timeline, settings
│   ├── templates/            # Jinja2 (base + partials)
│   └── static/               # css/js
└── data/                     # (gitignore) db.sqlite + thumbs/
```

## Decisões (ADR leve)
- **ADR-01: FastAPI+HTMX+Jinja em vez de SPA (React/Next).** Mais leve, sem build, suficiente
  p/ single-user. Custo: menos interatividade rica — aceitável.
- **ADR-02: Python em vez de Node.** Ecossistema superior p/ imagem/PSD/PDF (Pillow, psd-tools,
  PyMuPDF). Decisivo dado o nº de formatos.
- **ADR-03: SQLite, não Postgres.** Single-user local; arquivo único, zero infra.
- **ADR-04: Tailwind via CDN, não build.** Evita toolchain JS. Se a UI crescer muito, migrar p/
  build Tailwind é trivial.
- **ADR-05: Thumbnails derivados em cache isolado.** Preserva read-only do vault (RNF04/RNF08).
- **ADR-06: `.clip` sem render confiável.** Placeholder no MVP; reavaliar lib/CLI externa depois.

## Fluxos-chave
- **Indexação:** ao configurar/re-scan → walk do vault → para cada arquivo suportado calcular
  hash+mtime → upsert em `study` → enfileirar geração de thumbnail (não-bloqueante, RNF06).
- **Render galeria:** query paginada em `study` → grid de thumbnails (HTMX infinite scroll).
- **Detalhe:** join `study` + `tag` + `note` + links → página de detalhe.

> Schema detalhado em `03-modelo-dados.md`; features em `04-features.md`.
