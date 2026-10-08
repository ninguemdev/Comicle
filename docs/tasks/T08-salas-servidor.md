# T08 — Salas no servidor

**Depende de:** T04, T05 · **Pacotes:** server, shared · **Branch:** `task/08-salas-servidor`

## Objetivo
Salas multiplayer completas no servidor: criação, entrada por código, lobby, presença, reconexão, expulsão, configurações, transferência de anfitrião, encerramento e a projeção `PlayerView` do lobby.

## Leia antes
- `docs/regras-do-jogo.md` §3 e §4 (R4–R21)
- `docs/protocolo-realtime.md` §1 (`GET /api/rooms/:code`), §3 (`room:*`, `player:updateProfile`), §4, §5
- `docs/modelo-de-dados.md` §1 (`Room`, `Member`)
- `docs/arquitetura.md` §4 (Serialização, Projeção)

## Entregáveis
- [x] `rooms/room-code.ts` (R6) com nova tentativa em colisão.
- [x] `rooms/room.ts`: agregado `Room` com `runExclusive(fn)`.
- [x] `rooms/room-registry.ts`: índice por ID e por código; vínculo socket ↔ (sala, jogador).
- [x] `rooms/host-policy.ts` (puro): permissões das ações de anfitrião e `nextHost(room)` (R14).
- [x] `rooms/room.service.ts`: `create`, `join` (R9, R10, R12; reconexão pelo `guestId` reutiliza o `playerId`; R5), `leave` (R15), `kick` (R12), `updateSettings` (R11, R18–R21), `updateProfile` (R4), `handleDisconnect` (R13, R14), encerramento (R16) com `storyRepository.deleteRoom` e `room:removed`.
- [x] `views/build-player-view.ts` — parte da sala (`room`, `me`, `match: null`) e `publish(room)`.
- [x] Handlers dos eventos `room:*` e `player:updateProfile` via `defineHandler`.
- [x] `GET /api/rooms/:code` com rate limit.
- [x] Registro da sala em `rooms` na criação.

## Fora do escopo
- Iniciar partida (T11). `room.status` só assume `lobby` nesta task.

## Critérios de aceite
- [x] Toda mutação passa por `runExclusive`.
- [x] Timers (graça do anfitrião, remoção no lobby, sala vazia, idade máxima) usam o `Scheduler` com chaves por sala e são cancelados quando a condição deixa de valer.

## Testes obrigatórios (integração com `socket.io-client`)
- [x] R8/R6: criar sala → ack com código válido; criador é anfitrião.
- [x] Três clientes entram e todos recebem `room:view` com os três membros em ordem de entrada.
- [x] R9: 13º membro → `ROOM_FULL`; membro existente reconecta mesmo com a sala cheia.
- [x] R12: expulsão → `room:removed { reason: 'kicked' }`; tentar voltar → `KICKED`; anfitrião não expulsa a si mesmo.
- [x] R11: não anfitrião alterando configurações → `NOT_HOST`; anfitrião altera e todos recebem.
- [x] R14: anfitrião sai → função vai para o membro conectado mais antigo; anfitrião desconectado por `HOST_TRANSFER_GRACE_MS` → transferência; volta antes do prazo → mantém.
- [x] R13: desconectado no lobby é removido após o prazo; volta antes → mantém o `playerId`.
- [x] R5: segunda conexão da mesma sessão → a primeira recebe `session:replaced`.
- [x] R16: sala sem conectados por `EMPTY_ROOM_TTL_MS` é encerrada e `deleteRoom` é chamado.
- [x] R4: `player:updateProfile` com avatar inválido → `INVALID_PAYLOAD`.
- [x] `GET /api/rooms/:code`: existente → 200; inexistente → 404.

## Notas
- Use `startTestServer` com `ManualScheduler` e `FakeClock` para avançar o tempo sem esperar.
