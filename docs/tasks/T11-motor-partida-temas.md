# T11 — Motor de partida e etapa de temas

**Depende de:** T08, T10 · **Pacotes:** server · **Branch:** `task/11-motor-partida-temas`

## Objetivo
Máquina de fases pura, serviço da partida, início, etapa de temas completa e abortar partida. Ao fim da etapa de temas, a partida entra em `round_drawing` da rodada 0 (o conteúdo das rodadas vem na T12).

## Leia antes
- `docs/regras-do-jogo.md` §5, §6 (R22–R30), R57
- `docs/arquitetura.md` §4 (Tempo, Máquina de fases, Persistência)
- `docs/protocolo-realtime.md` §3 (`match:*`, `theme:*`), §5 (`write_theme`, `spectate`)
- `docs/modelo-de-dados.md` §1 (`Match`)

## Entregáveis
- [x] `modules/timing/game-timing.ts`: `GameTimingConfig` com perfis `default` (constantes) e `fast` (para E2E; recusado em produção), e `readingSeconds(roundIndex)` (R35).
- [x] `modules/matches/match-machine.ts` (puro): `(estado, evento, agora) → { estado, efeitos }`, cobrindo início, rascunho/envio de tema, prazo, encerramento antecipado e abortar. Efeitos como dados.
- [x] `modules/matches/match.service.ts`: executa efeitos (agendar, persistir, publicar) dentro de `runExclusive`.
- [x] `match:start` (R22–R25): assentos embaralhados com o `Rng` injetado, espectadores, plano de distribuição, `createMatch` no repositório, conteúdo da partida anterior apagado.
- [x] `theme:draft` e `theme:submit` (R26–R29); prazo (R30) com `modules/stories/fallback-themes.ts` (≥ 40 temas em pt-BR, divertidos e desenháveis).
- [x] `match:abort` (R57).
- [x] Projeção: `MatchView` para `theme_writing` (task `write_theme` com rascunho; `spectate` para espectadores; `progress` e `MemberView.progress`).
- [x] `room.status = 'in_match'` durante a partida; `me.role` correto.

## Fora do escopo
- Leitura, desenho e fechamento de rodadas (T12). Apresentação (T16).

## Critérios de aceite
- [x] A máquina de fases não importa nada de infraestrutura.
- [x] Temas de um jogador nunca aparecem na view de outro (R58).

## Testes obrigatórios
- [x] R22: não anfitrião → `NOT_HOST`; 1 conectado → `NOT_ENOUGH_PLAYERS`; fora do lobby → `INVALID_STATE`.
- [x] R23: com `SeededRng`, a ordem dos assentos é a esperada; autores = assentos.
- [x] R24: membro desconectado no início vira espectador e recebe `spectate`.
- [x] R25: iniciar a segunda partida chama `deleteMatch` da primeira.
- [x] R27: tema curto demais → `INVALID_PAYLOAD`.
- [x] R28: segundo `theme:submit` → `INVALID_STATE`; rascunho é devolvido na view.
- [x] R29: todos enviaram → fase termina antes do prazo.
- [x] R30: prazo esgota → final > rascunho válido > reserva sem repetição; `source` correto.
- [x] R57: abortar volta ao lobby e apaga a partida.
- [x] Máquina de fases: tabela de transições válidas e inválidas.
