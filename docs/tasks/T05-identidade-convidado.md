# T05 — Identidade de convidado

**Depende de:** T03 · **Pacotes:** server · **Branch:** `task/05-identidade-convidado`

## Objetivo
Sessões temporárias sem conta: emissão, validação, renovação e autenticação em HTTP e no Socket.IO.

## Leia antes
- `docs/regras-do-jogo.md` R3, R5
- `docs/protocolo-realtime.md` §1, §2
- `docs/decisoes.md` D13

## Entregáveis
- [x] `modules/guest-identity/session-store.ts`: cria sessão (32 bytes aleatórios base64url), guarda só o hash SHA-256, valida e renova (TTL deslizante de `GUEST_SESSION_TTL_MS`), remove expiradas periodicamente via `Scheduler`.
- [x] Rotas `POST /api/guest-sessions` (rate limit 10/min por IP) e `GET /api/guest-sessions/me`.
- [x] Hook HTTP `requireGuest` que lê `Authorization: Bearer`, valida e expõe `request.guestId`; 401 com `UNAUTHORIZED`.
- [x] Middleware do Socket.IO que valida `handshake.auth.token` e grava `socket.data.guestId`; inválido → `connect_error` com `UNAUTHORIZED`.

## Fora do escopo
- Perfil (nickname/avatar) — é enviado ao entrar na sala (T08).

## Critérios de aceite
- [x] O token em texto nunca é armazenado nem logado.
- [x] Sessões usam o `Clock` injetado (expiração testável sem esperar).

## Testes obrigatórios
- [x] R3: criar → `/me` com o token → 200 e mesmo `guestId`.
- [x] R3: após `GUEST_SESSION_TTL_MS` sem uso → 401; uso no meio do período renova o prazo.
- [x] R3: o store não contém o token em texto (inspeção do estado interno).
- [x] Socket sem token / com token inválido é recusado; com token válido conecta e tem `guestId`.
- [x] Logger: requisição com `Authorization` não aparece em claro nos logs (spy no destino do pino).
