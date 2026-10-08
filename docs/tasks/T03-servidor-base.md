# T03 — Servidor base

**Depende de:** T02 · **Pacotes:** server · **Branch:** `task/03-servidor-base`

## Objetivo
Esqueleto do servidor: composição testável, Socket.IO anexado ao Fastify, infraestrutura transversal (tempo, aleatoriedade, erros, handlers validados, rate limit) e utilitários de teste.

## Leia antes
- `docs/arquitetura.md` §3, §4 (Composição, Serialização, Tempo), §6, §7, §8
- `docs/protocolo-realtime.md` §2

## Entregáveis
- [x] `config/env.ts`: variáveis de `arquitetura.md` §6 validadas com Zod; erro claro na inicialização se inválidas.
- [x] `platform/clock.ts` (`Clock`, `SystemClock`), `platform/scheduler.ts` (`Scheduler` com chave, `TimerScheduler` real), `platform/random.ts` (`Rng` com `crypto`, `SeededRng` para testes), `platform/ids.ts`, `platform/errors.ts` (`DomainError(code, message)`).
- [x] `app.ts`: `buildApp(deps)` com Fastify, `@fastify/helmet`, `@fastify/cors` (de `CORS_ORIGINS`), `@fastify/rate-limit` registrado, error handler que converte `DomainError` em `{ error: { code, message } }`, `GET /healthz`.
- [x] `platform/realtime/socket-server.ts`: Socket.IO em `app.server`, `maxHttpBufferSize` de 3 MiB, CORS igual ao HTTP.
- [x] `platform/realtime/define-handler.ts`: `defineHandler(eventName, handler)` que valida com `clientEventSchemas[eventName]`, chama o handler, responde `Ack`, converte `DomainError` → `fail`, erro desconhecido → `INTERNAL` com log (sem payload no log).
- [x] `platform/realtime/rate-limit.ts`: token bucket por socket, configurável por evento; excesso → `RATE_LIMITED`.
- [x] `main.ts`: composição real, `listen`, desligamento gracioso em `SIGINT`/`SIGTERM` (fecha Socket.IO, Fastify e, a partir da T04, o banco).
- [x] `test/support/`: `FakeClock`, `ManualScheduler` (avança o tempo e dispara timers vencidos), `startTestServer(overrides)` (porta aleatória, retorna URL e `close`) e `connectClient(url, token?)` tipado com os eventos de `@comicle/shared`.
- [x] Logger pino com `redact` para `authorization`, `token` e `*.png`.

## Fora do escopo
- Sessões (T05), banco (T04), salas (T08).

## Critérios de aceite
- [x] `buildApp` não lê `process.env` nem relógio global: tudo chega por `deps`.
- [x] Um evento de teste registrado só em teste prova validação, ack e mapeamento de erros.

## Testes obrigatórios
- [x] `GET /healthz` → 200.
- [x] Payload inválido em evento → `INVALID_PAYLOAD`; `DomainError('NOT_HOST')` → ack com esse código; exceção qualquer → `INTERNAL`.
- [x] Rate limit: N+1 eventos em uma janela → o último recebe `RATE_LIMITED`.
- [x] `ManualScheduler`: reagendar a mesma chave cancela a anterior; `cancel` impede disparo; ordem de disparo por instante.
- [x] Config inválida → erro descritivo.

## Notas
- Não use `fastify-socket.io`; anexe direto ao `app.server` depois de `app.ready()`.
- O `ManualScheduler` é a base de quase todos os testes de partida: capriche na API (`advanceBy(ms)`, `advanceTo(t)`, `runDue()`).
