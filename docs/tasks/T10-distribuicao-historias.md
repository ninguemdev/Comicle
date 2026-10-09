# T10 — Distribuição das histórias

**Depende de:** T02 · **Pacotes:** server · **Branch:** `task/10-distribuicao-historias`

## Objetivo
Algoritmo puro que decide qual jogador desenha qual história em cada rodada, e a interface `GameMode` que o encapsula.

## Leia antes
- `docs/regras-do-jogo.md` §7 (R31–R33)
- `docs/arquitetura.md` §4 (Modos de jogo)
- `docs/decisoes.md` D8

## Entregáveis
- [x] `modules/game-modes/game-mode.ts`: interface `GameMode` e tipo `DistributionPlan`.
- [x] `modules/game-modes/collaborative/distribution.ts`: `buildCollaborativePlan(seats, totalRounds)` implementando R31.
- [x] `modules/game-modes/collaborative/collaborative-mode.ts`: `validateSettings`, `totalRounds` (R20), `buildPlan`, `hasReadingPhase` (R34, R35).
- [x] `modules/game-modes/registry.ts` com `collaborative` registrado.
- [x] Helper `storyForPlayer(plan, roundIndex, playerId)` e `playerForStory(plan, roundIndex, storyIndex)`.

## Fora do escopo
- Modo individual (só a interface precisa comportá-lo).

## Critérios de aceite
- [x] Código sem dependência de rede, banco, relógio ou aleatoriedade.

## Testes obrigatórios
- [x] R31: a tabela do exemplo com 5 jogadores em `regras-do-jogo.md` §7.
- [x] R32, para todo `N` de 2 a 12 e todo `totalRounds` de 2 a 12:
  - [x] bijeção em cada rodada;
  - [x] nenhum jogador com a mesma história em rodadas consecutivas;
  - [x] `totalRounds ≤ N − 1` → autor nunca desenha a própria história;
  - [x] `totalRounds ≤ N` → artistas distintos em cada história;
  - [x] `totalRounds = N` → cada jogador contribui exatamente uma vez para cada história.
- [x] R20: `per_player` com 7 participantes → 7 rodadas; `fixed(3)` → 3.
- [x] R34/R35: `hasReadingPhase(0) === false`, `hasReadingPhase(1) === true`.
