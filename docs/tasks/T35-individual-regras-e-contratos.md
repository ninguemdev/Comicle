# T35 — Modo individual: regras e contratos

**Depende de:** T12, T16 · **Pacotes:** shared, server · **Branch:** `task/35-individual-regras-e-contratos` · **Versão:** 1.1

## Objetivo
Definir as regras do modo Quadrinhos Individuais (`especificacao-produto.md` §9) em `regras-do-jogo.md`, liberar `mode: 'individual'` nas configurações (hoje recusado, R21) com quantidade de quadros e tempo total por história, e o `GameMode` individual (rodadas, distribuição, sem leitura).

## Leia antes
- `docs/especificacao-produto.md` §9
- `docs/regras-do-jogo.md` §4 e §12 (R18–R21, R62–R68)
- `docs/decisoes.md` D47, D48

## Decisões (D48)
- O autor não desenha o próprio tema: `N − 1` rodadas.
- 2 a 6 quadros por história (padrão 4); tempo total da história 2, 3, 4, 5, 6, 8 ou 10 min (padrão 5).
- Editor com o quadro atual grande, faixa de miniaturas numeradas e anterior/próximo.
- Apresentação por tema: o tema e todas as suas versões em seguida.
- Opções do colaborativo ocultas no modo individual.

## Entregáveis
- [x] Regras R62–R68 em `regras-do-jogo.md` §12; R18, R19 e R21 revistas; constantes na tabela §1.
- [x] Constantes `INDIVIDUAL_PANEL_COUNT_MIN/MAX/DEFAULT` e `STORY_SECONDS_OPTIONS/DEFAULT`.
- [x] `MatchSettings.individual = { panelsPerStory, storySeconds }` no tipo, no schema Zod e no padrão da sala; o schema aceita `mode: 'individual'`.
- [x] `individualMode` (`game-modes/individual/individual-mode.ts`): validação, `N − 1` rodadas, plano sem o autor, sem leitura.
- [x] Iniciar uma partida individual continua recusado (`INVALID_PAYLOAD`) até a T36 registrar o modo.
- [x] Docs: protocolo, modelo de dados, arquitetura, D48 e as tasks T36–T38 detalhadas.

## Fora do escopo
- Rodadas com vários quadros por jogador, envio e persistência (T36).
- Qualquer mudança visível no lobby (T37).

## Critérios de aceite
- [x] `room:updateSettings` aceita o modo individual com os campos novos e os reflete na `PlayerView`.
- [x] `match:start` com o modo individual responde `INVALID_PAYLOAD` e a sala fica no lobby.
- [x] O modo colaborativo não muda.

## Testes obrigatórios
- [x] R18: faixas de `panelsPerStory` e opções de `storySeconds` no schema e no modo.
- [x] R21: modo aceito nas configurações, partida ainda não inicia (integração).
- [x] R62: `N − 1` rodadas; opções do colaborativo ignoradas.
- [x] R63: para todo `N` de 2 a 12, bijeção por rodada, autor nunca recebe o próprio tema, cada jogador desenha cada tema dos outros uma vez.
- [x] R65: nenhuma rodada tem leitura.

## Notas
Task grande: usar o modo de planejamento e apresentar o plano antes de editar.
