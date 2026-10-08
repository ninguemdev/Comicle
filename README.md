# Comicle

Jogo multiplayer de navegador para criar **histórias em quadrinhos coletivas** com os amigos.

Cada jogador escreve uma ideia. As histórias circulam pela sala em rodadas: você lê os quadros que vieram antes, memoriza, confirma — e aí desenha a continuação **sem poder olhar de novo**. No fim, o anfitrião revela cada história quadro a quadro e depois como uma página de HQ completa. Sem cadastro, sem pontuação: a graça é ver como a memória imperfeita do grupo transforma as histórias.

**Status:** em desenvolvimento — veja o [andamento das tasks](docs/tasks/README.md).

---

## Como funciona uma partida

1. Alguém cria uma sala e manda o link de convite.
2. Cada um escolhe nickname e monta seu avatar.
3. O anfitrião define quantos quadros cada história terá e o tempo por quadro.
4. Todos escrevem um tema ("Um gato decide se candidatar à presidência").
5. Rodada a rodada, cada história passa para outra pessoa, que lê os quadros anteriores e desenha o próximo.
6. Na apresentação, o anfitrião conduz a revelação para todos ao mesmo tempo.

Regras completas em [`docs/regras-do-jogo.md`](docs/regras-do-jogo.md).

## Stack

| | |
|---|---|
| Linguagem | TypeScript (estrito) |
| Cliente | React 19, Vite, Tailwind CSS 4, Zustand, Canvas 2D |
| Servidor | Node.js 24, Fastify 5, Socket.IO 4 |
| Contratos | Zod 4 em um pacote compartilhado |
| Banco | PostgreSQL 17 + Drizzle ORM |
| Testes | Vitest, Testing Library, Playwright |
| Monorepo | pnpm workspaces |

Motivos de cada escolha em [`docs/arquitetura.md`](docs/arquitetura.md) e [`docs/decisoes.md`](docs/decisoes.md).

## Estrutura

```text
apps/web          cliente React
apps/server       servidor Fastify + Socket.IO
packages/shared   tipos, schemas, eventos e constantes compartilhados
e2e/              testes ponta a ponta
docs/             especificação, regras, arquitetura e tasks
```

## Rodando localmente

> Os comandos abaixo ficam disponíveis a partir da task T01.

Pré-requisitos: Node.js 24 (`nvm use`), pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install                 # também ativa os git hooks
docker compose up -d         # PostgreSQL
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
pnpm db:migrate
pnpm dev                     # web: http://localhost:5173 · server: http://localhost:3000
```

| Comando | |
|---|---|
| `pnpm test` | testes unitários e de integração |
| `pnpm test:db` | testes contra o PostgreSQL |
| `pnpm e2e` | testes ponta a ponta |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | qualidade |
| `pnpm avatars:check` | valida o catálogo de avatares |

Para testar com várias pessoas na mesma rede, abra o endereço da sua máquina na rede local (`pnpm dev` expõe o Vite com `--host`) ou use janelas anônimas para simular jogadores.

## Desenvolvendo com o Claude Code

O projeto foi preparado para ser construído task a task com o [Claude Code](https://claude.com/claude-code):

- [`AGENTS.md`](AGENTS.md) — regras de arquitetura, convenções, fluxo de git e Definition of Done (o `CLAUDE.md` importa este arquivo).
- [`docs/tasks/`](docs/tasks/README.md) — backlog em 22 tasks com critérios de aceite e testes obrigatórios.
- `.claude/commands/` — `/task NN` executa uma task do início ao PR; `/revisar` confere o trabalho contra a Definition of Done.
- `.claude/settings.json` — permissões do projeto e atribuição de commits desativada.

Fluxo típico:

```bash
claude
> /task 01
```

O Claude Code cria o branch `task/01-bootstrap-monorepo`, implementa, roda as verificações, abre o PR e para. Você revisa e faz o merge; depois, `/task 02`.

### Commits sem coautoria

Os commits deste repositório têm apenas o autor humano. Isso é garantido em três camadas:

1. `AGENTS.md` proíbe trailers de atribuição em commits e PRs.
2. `.claude/settings.json` desativa a atribuição do Claude Code (`attribution.commit` e `attribution.pr` vazios).
3. O hook `.githooks/commit-msg` remove `Co-Authored-By`, `Claude-Session` e linhas "Generated with Claude Code" de qualquer commit, além de validar o formato Conventional Commits.

O hook é ativado por `pnpm install`. Antes da T01, ative manualmente: `git config core.hooksPath .githooks`.

## Criando o repositório no GitHub

```bash
git init -b main
git config core.hooksPath .githooks
git add .
git commit -m "docs: adiciona especificação, arquitetura e backlog inicial"
gh repo create <usuario>/<nome-do-repo> --private --source . --push
```

Recomendado em **Settings → Branches**: proteger `main` exigindo PR e o check `CI` verde (o workflow é criado na T01). Em **Settings → General → Pull Requests**, deixar só "Allow squash merging".

Opcional: espelhar as tasks como issues com `scripts/sync-tasks-to-issues.sh`.

## Documentação

| Documento | Conteúdo |
|---|---|
| [Especificação de produto](docs/especificacao-produto.md) | Visão completa do jogo |
| [Regras do jogo](docs/regras-do-jogo.md) | Regras numeradas, constantes e casos de borda |
| [Protocolo](docs/protocolo-realtime.md) | HTTP, eventos Socket.IO e `PlayerView` |
| [Modelo de dados](docs/modelo-de-dados.md) | Memória, PostgreSQL e retenção |
| [Arquitetura](docs/arquitetura.md) | Stack, camadas, configuração, testes, produção |
| [Interface](docs/interface.md) | Identidade visual, telas, página de HQ, editor |
| [Avatares](docs/avatares.md) | Catálogo e guia para adicionar artes |
| [Decisões](docs/decisoes.md) | Registro de decisões |
| [Tasks](docs/tasks/README.md) | Backlog e status |

## Licença

A definir.
