# T01 — Bootstrap do monorepo

**Depende de:** — · **Pacotes:** raiz, web, server, shared · **Branch:** `task/01-bootstrap-monorepo`

## Objetivo
Estrutura de workspaces, ferramentas de qualidade, testes, banco local e CI funcionando, sem nenhuma funcionalidade de jogo.

## Leia antes
- `AGENTS.md` (todo)
- `docs/arquitetura.md` §1, §2, §6, §8

## Entregáveis
- [x] `package.json` raiz: `private`, `packageManager` (pnpm 10, versão exata), `engines.node >= 24`, e scripts:
  - `dev` (web e server em paralelo), `build`, `lint`, `typecheck`, `test`, `test:db`, `format`, `format:check`
  - `db:generate`, `db:migrate` (podem só repassar ao server; ficam funcionais na T04)
  - `avatars:check` e `e2e` como placeholders que imprimem "disponível na T07/T20" e saem com 0
  - `prepare`: `git config core.hooksPath .githooks || true`
- [x] `pnpm-workspace.yaml` com `apps/*` e `packages/*`.
- [x] `.nvmrc` (24) já existe — manter.
- [x] `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`, `moduleResolution: "bundler"`; cada pacote estende.
- [x] `packages/shared`: `package.json` (`name: "@hq/shared"`, `type: module`, `exports` apontando para `src/index.ts`), `src/index.ts` mínimo.
- [x] `apps/server`: `name: "@hq/server"`, `tsx watch` em dev, build com tsdown (empacotando `@hq/shared`), `src/main.ts` que sobe um Fastify mínimo com `GET /healthz`.
- [x] `apps/web`: `name: "@hq/web"`, Vite + React 19 + TS, página "HQ Coletiva — em construção", proxy de `/api` e `/socket.io` (com `ws: true`) para `localhost:3000`, e `server.host: true` para testar pela rede local.
- [x] ESLint flat config na raiz (`typescript-eslint` type-checked, `eslint-plugin-react-hooks`, `eslint-config-prettier`) e esqueleto das regras `no-restricted-imports` de `docs/arquitetura.md` §3.
- [x] Prettier (`.prettierrc`, `.prettierignore`), aspas simples, ponto e vírgula, largura 100.
- [x] Vitest com `projects` na raiz (`packages/shared`, `apps/server`, `apps/web` com jsdom); `pnpm test` roda todos; `test:db` roda só `**/*.db.test.ts` (com `--passWithNoTests` até a T04).
- [x] `docker-compose.yml`: `postgres:17`, usuário/senha/banco `hq`, volume nomeado, script de init criando `hq_test`, healthcheck.
- [x] `apps/server/.env.example` e `apps/web/.env.example` com as variáveis de `docs/arquitetura.md` §6.
- [x] `.github/workflows/ci.yml`: em `pull_request` e `push` para `main`; job `check` (install `--frozen-lockfile`, `format:check`, `lint`, `typecheck`, `test`, `build`) e job `db` com serviço Postgres 17 rodando `test:db`. Cache do pnpm.
- [x] Um teste trivial por pacote para validar o pipeline.

## Fora do escopo
- Qualquer código de domínio, Tailwind, Socket.IO, Drizzle (vêm nas próximas tasks).

## Critérios de aceite
- [x] `pnpm install` em clone limpo funciona sem avisos de peer dependency relevantes.
- [x] `pnpm dev` sobe web em `:5173` e server em `:3000`; a página carrega e `/api/healthz` via proxy responde (ajuste a rota do proxy se preferir `/healthz` direto).
- [x] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` passam.
- [ ] `docker compose up -d` deixa o Postgres saudável com os bancos `hq` e `hq_test`.
- [ ] CI verde no PR desta task.
- [x] `git config core.hooksPath` retorna `.githooks` após `pnpm install`.

## Testes obrigatórios
- [x] Teste trivial em cada pacote (ex.: `GET /healthz` responde 200 usando `app.inject`).

## Notas
- Use as versões estáveis mais recentes e deixe o lockfile travar. Registre em `docs/decisoes.md` qualquer desvio da stack.
- O web deve aceitar `VITE_BASE_PATH` desde já (`base` no `vite.config.ts`).
