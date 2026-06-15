# AGENTS.md — contrato p/ agentes de IA (Claude / Gemini / outros)

Ponto de entrada único p/ qualquer agente que for codar este projeto. Leia isto **antes** de
qualquer tarefa. Vale p/ Claude Code, Gemini CLI, etc. (`CLAUDE.md` e `GEMINI.md` apontam p/ cá.)

## 1. O que é
`draw-study` v2 — **app desktop pessoal (Tauri)** p/ estudo de desenho, **planner-cêntrico**:
abre na tela "Hoje" e diz o que praticar, organiza os desenhos do vault e mostra evolução.
Single-user, local, offline, sem auth.

## 2. Stack (fixada — não trocar sem pedir)
- **Tauri 2** (shell desktop) · **Rust** (commands/FS/indexação) · **SolidJS + Vite + TypeScript** (UI).
- **Tailwind** (build via Vite) · tema **claro** + acento **âmbar**.
- **SQLite** via `tauri-plugin-sql` (migrations) · `tauri-plugin-fs` · `-dialog` · `-opener` · `-notification`.
- Projeto v2 vive em **`tauri/`**. v1 (FastAPI+HTMX em `app/`) é **só referência** — não editar.

## 3. Documentos (ordem de leitura)
1. `documents/07-v2-conceito-e-requisitos.md` — **spec autoritativa** (conceito, RF-*, RNF, fluxo, MVP).
2. `documents/06-tauri-arquitetura.md` — stack, estrutura, schema SQL v2, commands, escrita no vault.
3. `documents/08-plano-desenvolvimento-agentes.md` — **backlog de tarefas** (pegue 1 ticket por vez).
4. `documents/03-modelo-dados.md` — schema base herdado da v1.
5. `progress.md` — estado atual; **atualizar ao fim de cada tarefa**.

## 4. Comandos
```bash
cd tauri
npm install                 # 1ª vez
npm run tauri dev           # rodar app desktop (dev)
npm run build               # build do frontend (typecheck inclui)
cd src-tauri && cargo check # checar Rust
npm run tauri build         # gerar instalador (release)
```

## 5. Regras de arquitetura
- **Trabalho pesado em Rust** (`#[tauri::command]`): scan do vault, thumbnails, qualquer
  operação de FS (criar pasta, importar, mover, renomear).
- **CRUD leve no frontend** via `tauri-plugin-sql` (tags, notas, planos, slots, logs, etc.).
- Frontend SolidJS: estado reativo (signals/stores), rotas por tela, componentes pequenos.
- Imagens na webview via `convertFileSrc()` (asset protocol), não via leitura base64.

## 6. Regras invioláveis (vault)
- Vault é **read-write controlado**. Escrita **só** por Rust command.
- **NUNCA apagar/sobrescrever** arquivo original do usuário sem confirmação explícita.
- Mover/renomear deve ser logado (permitir desfazer).
- Dados do app (DB, thumbs) em **appDataDir**, **fora do vault**.
- Degradação graciosa: formato sem preview → placeholder, nunca crashar.

## 7. Convenções
- Código/identificadores em **inglês**; UI e docs em **português**.
- Simples e legível (projeto solo). Sem abstração prematura.
- Componentes/commands pequenos e testáveis. Sem dependência pesada sem justificar.
- Commits: 1 por ticket, mensagem `M<n>-T<n>: <resumo>`.

## 8. Definition of Done (cada ticket)
1. `npm run build` passa (typecheck OK) e `cargo check` passa.
2. `npm run tauri dev` sobe sem erro no console.
3. O critério de aceite do ticket (em `08-...`) é atendido e verificado manualmente.
4. `progress.md` atualizado (o que foi feito + decisões + próximo).
5. Não quebrou tickets anteriores.

## 9. Como trabalhar (loop do agente)
1. Ler o ticket alvo em `08-plano-desenvolvimento-agentes.md` + docs referenciados.
2. Listar arquivos que vai criar/editar antes de codar.
3. Implementar **só o escopo do ticket**.
4. Verificar (DoD). 5. Atualizar `progress.md`. 6. Parar e reportar.
