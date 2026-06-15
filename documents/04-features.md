# 04 — Features (detalhe + fluxo de uso)

Cada feature referencia os RF de `01-requisitos.md`.

## F1 — Vault & Indexação (RF01-05)
**O quê:** configurar a pasta raiz; o app varre e indexa os arquivos suportados.
**Fluxo:**
1. Em *Settings*, usuário informa o caminho do vault → salvo em `setting.vault_path`.
2. *Scan* faz walk recursivo; para cada arquivo suportado calcula hash+mtime → upsert em `study`.
3. Thumbnails gerados em background e cacheados (`data/thumbs/`).
4. *Re-scan* detecta adicionados/removidos/alterados via diff hash+mtime.
**Regra:** read-only — nada é escrito no vault. Formato sem thumbnail → placeholder.

## F2 — Biblioteca / Galeria (RF06, RF10)
**O quê:** grid de thumbnails navegável + página de detalhe.
**Fluxo:** grid paginado (HTMX infinite scroll) → clicar abre detalhe (imagem grande,
metadados, tags, notas, links, coleções). Título editável (não altera o arquivo).

## F3 — Tags, Busca, Coleções (RF07-09)
**O quê:** classificar e localizar estudos.
**Fluxo:** adicionar/remover tags (categorias: técnica/tema/material/dificuldade); barra de
busca com filtros combinados (nome + tag + texto de nota); criar coleções e arrastar estudos
para elas (pastas virtuais, sem mexer no FS).

## F4 — Notas vinculadas + Grafo (RF11-14)
**O quê:** conhecimento conectado estilo Obsidian.
**Fluxo:** criar nota markdown por estudo ou avulsa; usar `[[wikilinks]]` p/ conectar; backlinks
aparecem automaticamente; preview renderiza markdown + imagens embutidas; visão de grafo mostra
nós (estudos/notas) e arestas (links/tags), navegável por clique.

## F5 — Planner / Cronograma (RF15-18)
**O quê:** planejar prática com intenção.
**Fluxo:** criar plano (objetivo, técnica-alvo, prazo); agendar sessões (data, duração,
técnica) num calendário; definir metas (ex.: "30 gestures/semana"); ao concluir uma sessão,
marcar `done` e vincular os estudos produzidos (`session_study`).

## F6 — Timeline & Dashboard (RF19-22)
**O quê:** visualizar evolução.
**Fluxo:** timeline cronológica dos estudos; comparação antes/depois por técnica; dashboard com
nº de estudos, streak de prática, horas e distribuição por técnica; heatmap de prática.

## F7 — Extras (RF23-26)
- **Deck de referência (RF23):** sorteio aleatório de imagens p/ gesture/timed drawing, com
  timer (30s/1m/5m) e avanço automático.
- **Referências externas (RF24):** anexar imagens de inspiração a um estudo (inspiração × resultado).
- **Exportar relatório (RF25):** gerar HTML/PDF de progresso por período.
- **Anotações na imagem (RF26):** pins/markers em coordenadas com comentário ("aqui errei proporção").

## Mapa feature → fase
| Feature | RF | Fase (ver `05-roadmap.md`) |
|---------|----|--------|
| F1 Vault & Indexação | RF01-05 | 1 |
| F2 Biblioteca | RF06, RF10 | 1 |
| F3 Tags/Busca/Coleções | RF07-09 | 2 |
| F4 Notas + Grafo | RF11-14 | 3 |
| F5 Planner | RF15-18 | 4 |
| F6 Timeline/Dashboard | RF19-22 | 5 |
| F7 Extras | RF23-26 | 6 |
