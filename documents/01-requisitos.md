# 01 — Requisitos

Identificadores estáveis (RFxx / RNFxx) — referenciados em `04-features.md` e `05-roadmap.md`.
Prioridade: **M** = MVP (Fases 0-1), **A** = alta, **B** = média, **C** = futura.

## Requisitos Funcionais (RF)

### Vault & Indexação
| ID | Requisito | Prio |
|----|-----------|------|
| RF01 | Configurar o caminho do **vault raiz** (1 vault no MVP; multi-vault depois). | M |
| RF02 | Varrer recursivamente o vault e **indexar** arquivos suportados no SQLite. | M |
| RF03 | Gerar e **cachear thumbnails** por formato (raster, PSD, PDF, procreate, kra). | M |
| RF04 | **Re-scan** manual; detectar adicionados/removidos/alterados (hash + mtime). | M |
| RF05 | **Read-only**: nunca mover/renomear/alterar o arquivo original no vault. | M |

### Biblioteca & Organização
| ID | Requisito | Prio |
|----|-----------|------|
| RF06 | **Galeria** em grid com thumbnails, paginação/scroll infinito. | M |
| RF07 | **Tags** por estudo (categorias: técnica, tema, material, dificuldade) — n:n. | A |
| RF08 | **Busca** por nome, tag e texto da nota; filtros combinados. | A |
| RF09 | **Coleções** (pastas virtuais) — agrupar estudos sem mexer no FS. | B |
| RF10 | **Detalhe** do estudo: imagem grande + metadados + notas + tags + links. | M |

### Notas vinculadas (grafo estilo Obsidian)
| ID | Requisito | Prio |
|----|-----------|------|
| RF11 | **Nota markdown** por estudo + notas avulsas (técnica/conceito). | A |
| RF12 | **Wikilinks** `[[...]]` entre estudos/notas; **backlinks** automáticos. | A |
| RF13 | **Visão de grafo** (nós = estudos/notas; arestas = links/tags). | B |
| RF14 | **Render markdown** com preview de imagem embutida. | A |

### Planner / Cronograma
| ID | Requisito | Prio |
|----|-----------|------|
| RF15 | Criar **plano de estudo**: objetivo, técnica-alvo, prazo. | A |
| RF16 | **Sessões agendadas** (data, duração, técnica) em calendário. | A |
| RF17 | **Metas** (ex.: "30 gestures/semana") com acompanhamento. | B |
| RF18 | Marcar sessão como **concluída** e vincular estudos produzidos nela. | A |

### Timeline / Progresso
| ID | Requisito | Prio |
|----|-----------|------|
| RF19 | **Timeline** cronológica dos estudos (data de criação/sessão). | A |
| RF20 | **Antes/depois** por técnica (comparação visual de evolução). | B |
| RF21 | **Dashboard**: nº de estudos, streak, horas, distribuição por técnica. | B |
| RF22 | **Heatmap** de prática (estilo GitHub contributions). | C |

### Extras pertinentes
| ID | Requisito | Prio |
|----|-----------|------|
| RF23 | **Deck de referência**: sorteio aleatório p/ gesture/timed drawing (timer 30s/1m/5m). | C |
| RF24 | **Anexar referências externas** a um estudo (inspiração × resultado). | C |
| RF25 | **Exportar relatório** de progresso (HTML/PDF) por período. | C |
| RF26 | **Anotações sobre a imagem** (pins/markers em coordenadas). | C |

## Requisitos Não-Funcionais (RNF)

| ID | Requisito |
|----|-----------|
| RNF01 | **Localhost only** — bind em `127.0.0.1`, sem exposição externa. |
| RNF02 | **Single-user, sem auth** — dados locais, sem contas. |
| RNF03 | **Leve** — startup < 2s, baixo uso de memória, sem build-step JS obrigatório. |
| RNF04 | **Read-only no vault** — integridade dos arquivos originais garantida. |
| RNF05 | **Cache de thumbnails** em disco p/ performance. |
| RNF06 | **Indexação não-bloqueante** — milhares de arquivos sem travar a UI (scan async/background). |
| RNF07 | **Portátil** — rodar com 1 comando (`uv run`) no Windows. |
| RNF08 | **Isolamento de dados** — DB + cache fora do vault (`data/` ou `~/.draw-study/`). |
| RNF09 | **Degradação graciosa** — formato sem thumbnail mostra placeholder, não quebra. |
| RNF10 | **Manutenibilidade** — código simples e legível (projeto solo). |

> Decisões de arquitetura em `02-arquitetura.md`.
