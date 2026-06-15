# 07 — v2: Conceito e Requisitos (autoritativo)

> Esta é a spec **alvo** (app Tauri). Substitui conceitualmente as decisões da v1 onde
> houver conflito. v1 (FastAPI) = referência. Stack/estrutura em `06-tauri-arquitetura.md`.

## Mudança de eixo
A v1 tratou tudo como features paralelas (biblioteca, notas, planner, timeline). Na v2 o
**cronograma/plano é o núcleo** — ele dirige o uso diário e organiza os arquivos. Tudo o mais
(biblioteca, notas, timeline) orbita em volta da rotina.

**Dor #1 a resolver: consistência.** Logo, o app abre no "hoje" e responde *"o que pratico
agora"* a partir dos planos.

## Decisões da descoberta (rodadas de perguntas)
| Tema | Decisão |
|------|---------|
| Foco do estudo | cursos + prática livre + referência + projetos (tudo) |
| Maior dor | **consistência** (depois: evolução, notas conectadas, achar) |
| Arquivos | pastas no PC + papel escaneado |
| "O que praticar hoje" | derivado do **cronograma que eu monto** |
| Evolução | **timeline contínua** (cronológica) |
| Cursos | só **vincular** (de qual curso/lição veio o estudo) |
| Unidade diária | **fiz/não fiz** (binário) |
| Entrada | arrastar/importar + modelo de vault (posso criar pastas pelo app) |
| Escrita no vault | **pode mover/renomear** (read-write, organiza de verdade) |
| Import vai p/ | **pasta por plano** |
| Plano ↔ pasta | **plano → pasta com subpastas** (técnica/lição) |
| Agenda | **template semanal** recorrente |
| Concluir o dia | anexar estudo + nota rápida + tempo gasto |
| Planos ativos | **vários em paralelo** ("hoje" junta todos) |
| Consistência | **meta semanal** (ex: 5/7 dias); streak por semana |

## Modelo de domínio (v2)

```
plano (nome, pasta_vault, meta_semanal_dias, ativo)
  └─ slots semanais  (dia_semana, técnica/lição, subpasta)     ← template recorrente
  └─ subpastas no vault (por técnica/lição)
log_diario (data, plano, slot?, feito, estudo?, nota_rápida, minutos)  ← registro do dia
estudo (arquivo indexado)  ── course_id?, lesson (texto)  ← vínculo leve a curso
curso (nome)
tag, nota, referência, anotação   (como v1)
```

- **"Hoje"** = para o dia da semana atual, juntar os `slots` de todos os planos ativos →
  lista de práticas sugeridas. Marcar feito gera um `log_diario` (anexa estudo + nota + tempo).
- **Consistência** = na semana atual, dias com `log` feito vs `meta_semanal_dias` (somada dos
  planos). Streak = nº de semanas consecutivas batendo a meta.
- **Import** = arrastar arquivo → escolher plano (+ subpasta/técnica) → app **move/copia** p/
  `vault/<pasta_plano>/<subpasta>/` e indexa.

## Requisitos Funcionais v2 (revisados)

**Núcleo — Rotina/Consistência**
- RF-A1 — Tela inicial "**Hoje**": práticas sugeridas a partir dos planos ativos (dia da semana).
- RF-A2 — Marcar prática como **feita** no dia (gera `log_diario`).
- RF-A3 — Ao concluir: **anexar estudo** produzido + **nota rápida** + **tempo** (opcionais).
- RF-A4 — **Meta semanal** por plano (ex: 5 dias/semana); painel X/Y da semana.
- RF-A5 — **Streak semanal** (semanas consecutivas batendo a meta) + calendário/heatmap.

**Planos / Cronograma**
- RF-B1 — Criar **plano** com pasta no vault + subpastas (técnica/lição).
- RF-B2 — **Template semanal**: definir slots (dia → técnica/lição/subpasta).
- RF-B3 — **Vários planos ativos** em paralelo; "Hoje" agrega todos.
- RF-B4 — Ativar/arquivar plano.

**Biblioteca / Organização (write-enabled)**
- RF-C1 — Indexar o vault (scan recursivo) + thumbnails por formato.
- RF-C2 — **Importar** (arrastar) → rotear p/ pasta do plano; mover/renomear permitido.
- RF-C3 — Galeria, detalhe, tags por categoria, busca/filtros, coleções.
- RF-C4 — Vincular estudo a **curso/lição** (texto leve).

**Conhecimento**
- RF-D1 — Notas markdown + wikilinks/backlinks + grafo (como v1).
- RF-D2 — Referências externas (inspiração) e anotações na imagem (pins).

**Evolução**
- RF-E1 — **Timeline contínua** cronológica de todos os estudos.
- RF-E2 — Filtro por técnica/plano na timeline.
- RF-E3 — Dashboard: streak, semana atual, horas, distribuição por técnica.

**Extras**
- RF-F1 — Deck de sorteio + timer (gesture/timed drawing).
- RF-F2 — Relatório de período (export).
- RF-F3 — Notificação nativa opcional (lembrete diário) — Tauri.

## Requisitos Não-Funcionais v2 (revisados)
- RNF-1 — App **desktop local** (Tauri); sem servidor/terminal.
- RNF-2 — Single-user, sem auth.
- RNF-3 — **Vault read-write controlado**: app cria pastas, importa, move/renomeia. **Nunca
  apaga** arquivo do usuário sem confirmação explícita; operações de mover são logadas/undo-friendly.
- RNF-4 — Dados do app (DB + thumbs) **fora do vault** (appDataDir).
- RNF-5 — Leve e rápido; offline.
- RNF-6 — Indexação não-bloqueante (scan/thumbnail em background no Rust).
- RNF-7 — Degradação graciosa (formato sem preview → placeholder).

## Fluxo principal (dia típico)
1. Abre app → **Hoje** mostra "Seg: gesture (Plano Fundamentos)".
2. Pratica; arrasta a foto/scan p/ a janela → app guarda em `vault/Fundamentos/gesture/`.
3. Marca feito → anexa o estudo recém-importado + nota "melhorar fluidez" + 25 min.
4. Painel: "semana 4/5 ✓", streak 6 semanas.
5. Quando quiser, abre **Timeline** e vê a evolução contínua.

## MVP (sequência sugerida)
1. **M1 — Núcleo rotina**: planos + template semanal + tela Hoje + marcar feito + meta/streak semanal.
2. **M2 — Biblioteca + import**: scan, thumbnails, importar p/ pasta do plano, detalhe.
3. **M3 — Evolução**: timeline contínua + dashboard.
4. **M4 — Conhecimento**: notas/tags/coleções/grafo.
5. **M5 — Extras**: deck/timer, referências, anotações, relatório, notificação.
