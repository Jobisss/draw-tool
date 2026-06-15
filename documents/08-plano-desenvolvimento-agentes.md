# 08 — Plano de Desenvolvimento p/ Agentes

Backlog executável por agentes (Claude/Gemini). **1 ticket por vez**, em ordem (respeite
`depende`). Cada ticket: objetivo, arquivos, passos, **aceite** (verificável), verificação.
Regras gerais em `AGENTS.md`. Spec em `07-v2-...`. Ao terminar um ticket → atualizar `progress.md`.

Convenção de ID: `M<milestone>-T<n>`. Estimativa = tamanho relativo (P/M/G).

---

## M0 — Fundação (scaffold + infra)

### M0-T1 — Bootstrap do projeto Tauri  · P · depende: —
- **Objetivo:** projeto `tauri/` (solid-ts) compilando e abrindo janela.
- **Arquivos:** `tauri/` (já scaffolded). Rodar `npm install`.
- **Passos:** `cd tauri && npm install`; `npm run tauri dev` abre janela "Welcome".
- **Aceite:** janela desktop abre sem erro; `cargo check` em `src-tauri` OK.
- **Verif.:** `npm run tauri dev` sobe; fechar limpo.

### M0-T2 — Tailwind + tema base · P · depende: M0-T1
- **Objetivo:** Tailwind via Vite + tema claro/âmbar + layout base (sidebar + área).
- **Arquivos:** `tauri/tailwind.config.js`, `postcss.config.js`, `src/index.css`, `src/App.tsx`,
  `src/components/Layout.tsx`, `src/components/Sidebar.tsx`.
- **Passos:** instalar tailwind+postcss+autoprefixer; configurar; layout com nav (Hoje,
  Biblioteca, Timeline, Notas, Grafo, Planos, Configurações).
- **Aceite:** app mostra sidebar + conteúdo; cores claro/âmbar; navegação client-side funciona.
- **Verif.:** clicar nos itens troca a view.

### M0-T3 — Plugins Tauri + SQLite migrations · M · depende: M0-T1
- **Objetivo:** `tauri-plugin-sql` com schema v2 + plugins fs/dialog/opener/notification.
- **Arquivos:** `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/*.json`,
  `src-tauri/migrations/0001_init.sql`, `src/lib/db.ts`.
- **Passos:** adicionar plugins; registrar no `lib.rs`; migration com schema de
  `06-tauri-arquitetura.md` (study, tag, study_tag, note, note_link, collection,
  collection_study, reference, annotation, setting, **plan, plan_slot, day_log, course** + colunas
  `study.course_id`, `study.lesson`); wrapper `db.ts` (load + select/execute tipados).
- **Aceite:** DB criado em appDataDir; `db.ts` faz select numa tabela sem erro; tabelas existem.
- **Verif.:** log do nº de tabelas no boot; arquivo `.sqlite` aparece em appDataDir.

### M0-T4 — Settings + escolher vault · P · depende: M0-T3
- **Objetivo:** tela Configurações: escolher pasta do vault (dialog) e persistir em `setting`.
- **Arquivos:** `src/routes/Settings.tsx`, `src/lib/api.ts`, command Rust `pick_vault` (opcional;
  pode usar `tauri-plugin-dialog` direto no front).
- **Aceite:** escolho pasta → salva em `setting.vault_path` → persiste após restart.
- **Verif.:** reabrir app mostra o vault salvo.

---

## M1 — Núcleo da rotina (MVP central) — RF-A*, RF-B*

### M1-T1 — CRUD de planos · M · depende: M0-T3
- **Objetivo:** criar/listar/ativar/arquivar plano (nome, meta_semanal_dias, ativo).
- **Arquivos:** `src/routes/Plans.tsx`, `src/lib/plans.ts` (queries plugin-sql).
- **Aceite:** crio plano, vejo na lista, ativo/arquivo; persiste.
- **Verif.:** criar 2 planos, arquivar 1 → lista reflete.

### M1-T2 — Pasta do plano no vault (Rust) · M · depende: M1-T1, M0-T4
- **Objetivo:** command `create_plan_folders(plan_id)` cria `vault/<nome>/` + subpastas.
- **Arquivos:** `src-tauri/src/vault.rs` (command), `src/lib/api.ts`.
- **Aceite:** ao criar plano (ou botão), pasta+subpastas aparecem no vault; idempotente.
- **Verif.:** conferir FS após criar.

### M1-T3 — Template semanal (slots) · M · depende: M1-T1
- **Objetivo:** editar slots por dia-da-semana (técnica/lição/subpasta) de um plano.
- **Arquivos:** `src/routes/PlanDetail.tsx`, `src/lib/plans.ts`.
- **Aceite:** adiciono "Seg=gesture", "Qua=anatomia"; persiste; lista por dia.
- **Verif.:** recarregar mostra slots salvos.

### M1-T4 — Tela "Hoje" · G · depende: M1-T3
- **Objetivo:** agrega slots dos planos **ativos** p/ o dia-da-semana atual → lista de práticas.
- **Arquivos:** `src/routes/Today.tsx`, `src/lib/today.ts`.
- **Aceite:** mostra práticas de hoje de todos os planos ativos; vazio = mensagem de descanso.
- **Verif.:** com slots em 2 planos no mesmo dia, ambos aparecem.

### M1-T5 — Concluir prática (day_log) · G · depende: M1-T4
- **Objetivo:** marcar prática feita → cria `day_log` (done) + opcional nota rápida + minutos +
  (anexar estudo entra em M2-T4).
- **Arquivos:** `src/routes/Today.tsx`, `src/lib/logs.ts`.
- **Aceite:** marco feito → some/risca da lista de hoje; reabrir mantém estado do dia.
- **Verif.:** marcar, recarregar, continua feito.

### M1-T6 — Meta + streak semanal · M · depende: M1-T5
- **Objetivo:** painel "semana X/Y" (dias com log vs meta somada) + streak de semanas.
- **Arquivos:** `src/components/WeekStatus.tsx`, `src/lib/consistency.ts`.
- **Aceite:** logs da semana contam corretos; streak = semanas consecutivas batendo meta.
- **Verif.:** inserir logs de teste → números batem.

---

## M2 — Biblioteca + import (write-enabled) — RF-C*

### M2-T1 — Scan do vault (Rust) · G · depende: M0-T4
- **Objetivo:** command `scan_vault()` — walk recursivo, hash parcial, upsert em `study`,
  remove sumidos. (porta lógica do `indexer.py` v1).
- **Arquivos:** `src-tauri/src/indexer.rs` (crate `walkdir`, `sha1/blake3`).
- **Aceite:** scan popula `study`; rescan idempotente; remove apaga linha.
- **Verif.:** apontar pasta teste, scan, conferir contagem.

### M2-T2 — Thumbnails (Rust) · G · depende: M2-T1
- **Objetivo:** command `generate_thumbnail(study)` por formato → cache em appDataDir/thumbs.
  raster=`image`, procreate/kra=`zip`, psd=`psd`, pdf=`pdfium-render`, clip=placeholder.
- **Arquivos:** `src-tauri/src/thumbnails.rs`.
- **Aceite:** raster/zip/psd/pdf geram webp; clip/md → sem thumb (placeholder na UI).
- **Verif.:** vault de teste com 1 de cada → conferir cache.

### M2-T3 — Galeria + detalhe · G · depende: M2-T2
- **Objetivo:** grid de thumbnails (`convertFileSrc`), busca/filtro (nome/formato/tag), detalhe.
- **Arquivos:** `src/routes/Library.tsx`, `src/routes/StudyDetail.tsx`, `src/components/Gallery.tsx`.
- **Aceite:** galeria mostra thumbs; busca filtra; detalhe abre imagem + metadados.
- **Verif.:** filtrar por formato reduz a lista.

### M2-T4 — Importar (arrastar) → pasta do plano · G · depende: M2-T1, M1-T3
- **Objetivo:** drop de arquivo → escolher plano+subpasta → command `import_study` move/copia p/
  `vault/<plano>/<subfolder>/` → indexa → (permite anexar ao day_log de M1-T5).
- **Arquivos:** `src-tauri/src/vault.rs` (`import_study`, `move_study`), `src/components/DropZone.tsx`.
- **Aceite:** arrasto imagem → vai p/ pasta certa no vault → aparece na galeria.
- **Verif.:** conferir FS + galeria. **Não** apaga original sem confirmação.

### M2-T5 — Tags, coleções, vínculo a curso · M · depende: M2-T3
- **Objetivo:** tags por categoria, coleções (pastas virtuais), `study.course_id`+`lesson`.
- **Arquivos:** `src/lib/tags.ts`, `src/lib/collections.ts`, `src/routes/Collections.tsx`,
  edições em `StudyDetail.tsx`.
- **Aceite:** adicionar/remover tag/coleção; vincular curso/lição; busca por tag funciona.
- **Verif.:** filtrar por tag; coleção lista os estudos certos.

---

## M3 — Evolução — RF-E*

### M3-T1 — Timeline contínua · M · depende: M2-T3
- **Objetivo:** scroll cronológico de todos os estudos (agrupado por mês), filtro por técnica/plano.
- **Arquivos:** `src/routes/Timeline.tsx`, `src/lib/timeline.ts`.
- **Aceite:** ordem cronológica correta; filtro por técnica reduz.
- **Verif.:** estudos de meses diferentes agrupam certo.

### M3-T2 — Dashboard · M · depende: M1-T6, M2-T1
- **Objetivo:** cards (streak, semana atual, horas, nº estudos) + heatmap + por técnica.
- **Arquivos:** `src/routes/Dashboard.tsx`, `src/lib/stats.ts`.
- **Aceite:** números batem com os dados; heatmap por dias com log.
- **Verif.:** comparar com queries manuais.

---

## M4 — Conhecimento — RF-D*

### M4-T1 — Notas markdown + wikilinks/backlinks · G · depende: M0-T3
- **Objetivo:** CRUD de notas (`markdown-it` no front), `[[wikilink]]`→link, backlinks, re-sync.
- **Arquivos:** `src/routes/Notes.tsx`, `src/routes/NoteDetail.tsx`, `src/lib/notes.ts`.
- **Aceite:** criar nota, link entre notas resolve, backlinks aparecem.
- **Verif.:** A→[[B]] gera backlink em B.

### M4-T2 — Grafo · M · depende: M4-T1
- **Objetivo:** grafo de notas (lib leve, ex `vis-network`/`@cosmograph/cosmos`); clique abre.
- **Arquivos:** `src/routes/Graph.tsx`.
- **Aceite:** nós/arestas refletem note_link; clique navega.
- **Verif.:** grafo com 3 notas/2 links correto.

### M4-T3 — Referências + anotações na imagem · M · depende: M2-T3
- **Objetivo:** referências externas (URL) por estudo; pins de anotação em coordenada % na imagem.
- **Arquivos:** `src/components/ReferenceList.tsx`, `src/components/ImageAnnotator.tsx`, libs em
  `src/lib/study.ts`.
- **Aceite:** adiciono ref por URL; clico na imagem → pin com texto; remover funciona.
- **Verif.:** pin persiste em % (responsivo ao redimensionar).

---

## M5 — Extras — RF-F*

### M5-T1 — Deck de sorteio + timer · M · depende: M2-T3
- **Objetivo:** sortear raster (filtro por técnica) + timer (30s/1m/2m/5m) auto-advance.
- **Arquivos:** `src/routes/Practice.tsx`, command `random_studies` (ou query plugin-sql).
- **Aceite:** sessão roda, timer conta, avança/pula/pausa.
- **Verif.:** deck de 5 cicla certo.

### M5-T2 — Relatório de período · M · depende: M3-T2
- **Objetivo:** resumo por período (sessões/horas/estudos/por técnica), export (print/PDF).
- **Arquivos:** `src/routes/Report.tsx`.
- **Aceite:** período filtra; export gera PDF legível.
- **Verif.:** range conhecido → números batem.

### M5-T3 — Notificação diária (opcional) · P · depende: M1-T4
- **Objetivo:** `tauri-plugin-notification` lembrete no horário configurado.
- **Arquivos:** `src/lib/notify.ts`, Settings.
- **Aceite:** notificação dispara no horário; desligável.
- **Verif.:** agendar p/ +1min e observar.

---

## Grafo de dependências (resumo)
```
M0-T1 → M0-T2
      → M0-T3 → M0-T4 → M1-T1 → M1-T2
                                → M1-T3 → M1-T4 → M1-T5 → M1-T6
                        M0-T4 → M2-T1 → M2-T2 → M2-T3 → M2-T4(+M1-T3) / M2-T5
M2-T3 → M3-T1 ;  M1-T6+M2-T1 → M3-T2
M0-T3 → M4-T1 → M4-T2 ; M2-T3 → M4-T3
M2-T3 → M5-T1 ; M3-T2 → M5-T2 ; M1-T4 → M5-T3
```

## Ordem recomendada (caminho crítico)
M0-T1 → M0-T2 → M0-T3 → M0-T4 → **M1 inteiro** (entrega rotina utilizável) → M2 → M3 → M4 → M5.

## Checklist por ticket (cole no commit)
- [ ] escopo só do ticket  - [ ] `npm run build` ok  - [ ] `cargo check` ok
- [ ] `tauri dev` sobe  - [ ] aceite atendido  - [ ] `progress.md` atualizado
