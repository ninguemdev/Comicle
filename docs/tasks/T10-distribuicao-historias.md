# T10 — Distribuição das histórias

**Depende de:** T02 · **Pacotes:** server · **Branch:** `task/10-distribuicao-historias`

## Objetivo
Algoritmo puro que decide qual jogador desenha qual história em cada rodada, e a interface `GameMode` que o encapsula.

## Leia antes
- `docs/regras-do-jogo.md` §7 (R31–R33)
- `docs/arquitetura.md` §4 (Modos de jogo)
- `docs/decisoes.md` D8

## Entregáveis
- [ ] `modules/game-modes/game-mode.ts`: interface `GameMode` e tipo `DistributionPlan`.
- [ ] `modules/game-modes/collaborative/distribution.ts`: `buildCollaborativePlan(seats, totalRounds)` implementando R31.
- [ ] `modules/game-modes/collaborative/collaborative-mode.ts`: `validateSettings`, `totalRounds` (R20), `buildPlan`, `hasReadingPhase` (R34, R35).
- [ ] `modules/game-modes/registry.ts` com `collaborative` registrado.
- [ ] Helper `storyForPlayer(plan, roundIndex, playerId)` e `playerForStory(plan, roundIndex, storyIndex)`.

## Fora do escopo
- Modo individual (só a interface precisa comportá-lo).

## Critérios de aceite
- [ ] Código sem dependência de rede, banco, relógio ou aleatoriedade.

## Testes obrigatórios
- [ ] R31: a tabela do exemplo com 5 jogadores em `regras-do-jogo.md` §7.
- [ ] R32, para todo `N` de 2 a 12 e todo `totalRounds` de 2 a 12:
  - [ ] bijeção em cada rodada;
  - [ ] nenhum jogador com a mesma história em rodadas consecutivas;
  - [ ] `totalRounds ≤ N − 1` → autor nunca desenha a própria história;
  - [ ] `totalRounds ≤ N` → artistas distintos em cada história;
  - [ ] `totalRounds = N` → cada jogador contribui exatamente uma vez para cada história.
- [ ] R20: `per_player` com 7 participantes → 7 rodadas; `fixed(3)` → 3.
- [ ] R34/R35: `hasReadingPhase(0) === false`, `hasReadingPhase(1) === true`.
