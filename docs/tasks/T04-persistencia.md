# T04 — Persistência

**Depende de:** T03 · **Pacotes:** server · **Branch:** `task/04-persistencia`

## Objetivo
Banco PostgreSQL com Drizzle, migrações versionadas, repositório de conteúdo com duas implementações (Postgres e memória) e limpeza na inicialização.

## Leia antes
- `docs/modelo-de-dados.md` §2, §3
- `docs/regras-do-jogo.md` R16, R17, R25
- `docs/decisoes.md` D3

## Entregáveis
- [ ] `platform/db/schema.ts` com as tabelas de `modelo-de-dados.md` §2, FKs com `ON DELETE CASCADE`, `UNIQUE (story_id, position)` e índices em FKs.
- [ ] `drizzle.config.ts`; migração inicial gerada em `apps/server/drizzle/`; scripts `db:generate` e `db:migrate` funcionando pela raiz.
- [ ] `platform/db/client.ts` (pool `pg`, `close()`), `platform/db/migrate.ts` executado na inicialização.
- [ ] `modules/stories/story-repository.ts` (interface de `modelo-de-dados.md` §2), `drizzle-story-repository.ts`, `in-memory-story-repository.ts`.
- [ ] Suíte de contrato `story-repository.contract.ts` executada contra as duas implementações (memória em `pnpm test`, Postgres em `pnpm test:db`).
- [ ] Inicialização chama `deleteAllOpenRooms()` e registra quantas salas foram limpas (R17).
- [ ] `/healthz` verifica o banco (`select 1`) e responde 503 se indisponível.
- [ ] Setup de `test:db`: recria o schema em `hq_test` antes da suíte.

## Fora do escopo
- Uso do repositório pelos fluxos de sala/partida (T08, T11, T12).

## Critérios de aceite
- [ ] `docker compose up -d && pnpm db:migrate && pnpm dev` funciona do zero.
- [ ] Nenhum SQL manual fora das migrações geradas (exceto o init do Docker que cria `hq_test`).
- [ ] CI roda `test:db` contra o serviço Postgres e passa.

## Testes obrigatórios (suíte de contrato)
- [ ] `createRoom` → `createMatch` → `saveRoundPanels` → `getPanelImage` devolve os mesmos bytes.
- [ ] `saveRoundPanels` é atômico: um painel inválido na lista (posição duplicada) faz nada ser salvo.
- [ ] `deleteRoom` apaga em cascata partidas, temas, histórias e quadros.
- [ ] `deleteMatch` apaga só aquela partida (R25).
- [ ] `deleteAllOpenRooms` remove todas as salas e devolve a contagem (R17).
- [ ] `getPanelImage` de ID inexistente → `null`; de quadro `empty` → `null`.

## Notas
- `bytea` no Drizzle: use `customType` que mapeia para `Buffer`/`Uint8Array`.
- Gere IDs (`uuid`) no código, não no banco, para os objetos em memória e no banco terem o mesmo ID desde o início.
