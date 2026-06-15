# 00 — Visão Geral

## Problema
Os arquivos de estudo de desenho (scans, fotos, digitais em PSD/Procreate/Krita, PDFs de
referência, anotações soltas) ficam **espalhados pelo sistema de arquivos**, sem indexação,
sem visão de evolução e sem qualquer planejamento. Não há como:
- localizar rapidamente um estudo por técnica/tema;
- enxergar o progresso ao longo do tempo;
- planejar sessões de prática com metas;
- conectar anotações e conceitos entre estudos.

## Objetivo
Construir um **"Obsidian focado em estudo de desenho"**: uma aplicação web local que aponta
para uma pasta-cofre (vault), indexa os desenhos e, sobre isso, oferece organização
(biblioteca + tags), conhecimento conectado (notas + grafo), planejamento (cronograma) e
acompanhamento (timeline + dashboard de progresso).

## Proposta de valor
- **Centralizar** todos os estudos num único índice navegável.
- **Visualizar evolução** (antes/depois, timeline, heatmap de prática).
- **Planejar com intenção** (planos, sessões, metas por técnica).
- **Conectar conhecimento** (notas markdown + wikilinks + grafo).
- **Zero fricção / zero risco**: read-only sobre os arquivos originais.

## Escopo
**Dentro:** indexação de vault local, biblioteca/galeria, tags, busca, coleções, notas
vinculadas, grafo, planner, timeline, dashboard, deck de sorteio p/ gesture drawing.

**Fora (por ora):** multiusuário, login/auth, sincronização em nuvem, edição dos arquivos
de desenho, app mobile/desktop nativo, colaboração.

## Persona
**Único usuário = o próprio desenvolvedor/artista.** Técnico, roda localmente no Windows,
quer leveza e simplicidade acima de recursos enterprise. Sem necessidade de contas,
permissões ou hospedagem.

## Plataforma
Web (browser), acessada em `http://127.0.0.1:8000`. Localhost-only.

## Princípios norteadores
1. **Leve** — sem build-step pesado, dependências mínimas, startup rápido.
2. **Read-only no vault** — os arquivos originais são sagrados.
3. **Simples de manter** — projeto solo, código legível.
4. **Incremental** — entregar por fases utilizáveis (ver `05-roadmap.md`).

> Requisitos detalhados em `01-requisitos.md`.
