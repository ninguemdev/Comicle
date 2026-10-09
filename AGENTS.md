# AGENTS.md

Instruções para agentes de código (Claude Code e outros) trabalhando neste repositório. Leia inteiro antes da primeira alteração em cada sessão.

## O projeto

Jogo multiplayer de navegador em que grupos de amigos criam **histórias em quadrinhos coletivas**: cada jogador escreve um tema, as histórias circulam em rodadas, cada um desenha um quadro depois de ver (e memorizar) os anteriores, e no fim o anfitrião revela tudo como páginas de HQ. Sem contas, sem pontuação. A v1 tem só o modo **Quadrinhos Colaborativos**.

Nome: **Comicle** (pacotes `@comicle/*`).

## Fontes de verdade

Em caso de dúvida, nesta ordem:

| Documento | Responde |
|---|---|
| [`docs/especificacao-produto.md`](docs/especificacao-produto.md) | **O quê** e **por quê** (visão do produto; não editar sem pedido do usuário) |
| [`docs/regras-do-jogo.md`](docs/regras-do-jogo.md) | Regras precisas e numeradas (`Rnn`), constantes, casos de borda |
| [`docs/protocolo-realtime.md`](docs/protocolo-realtime.md) | Contrato HTTP e Socket.IO, `PlayerView` |
| [`docs/modelo-de-dados.md`](docs/modelo-de-dados.md) | Estado em memória, tabelas, retenção |
| [`docs/arquitetura.md`](docs/arquitetura.md) | Stack, estrutura, camadas, testes, configuração |
| [`docs/interface.md`](docs/interface.md) | Identidade visual, telas, página de HQ, editor de desenho |
| [`docs/avatares.md`](docs/avatares.md) | Catálogo, renderização e artes |
| [`docs/avatares-guia-de-artes.md`](docs/avatares-guia-de-artes.md) | Guia para desenhar as artes: estilo, tamanhos, gabarito, zonas |
| [`docs/decisoes.md`](docs/decisoes.md) | Decisões tomadas e seus motivos |
| [`docs/tasks/`](docs/tasks/README.md) | O que fazer agora, critérios de aceite, status |

Se dois documentos conflitarem, ou se a task exigir algo que nenhum documento cobre, **pare e pergunte ao usuário**. Não invente regra de jogo. Quando uma decisão for tomada, registre-a no documento certo no mesmo PR.

## Stack em uma linha

TypeScript estrito · pnpm workspaces · React 19 + Vite + Tailwind 4 + Zustand · Fastify 5 + Socket.IO 4 · Zod 4 · PostgreSQL 17 + Drizzle · Canvas 2D · Vitest + Testing Library + Playwright · ESLint + Prettier · Node 24. Detalhes e motivos em [`docs/arquitetura.md`](docs/arquitetura.md#1-stack).

## Estrutura

```text
apps/web          cliente React
apps/server       servidor Fastify + Socket.IO
packages/shared   tipos, schemas Zod, eventos, constantes, catálogo de avatares (@comicle/shared)
e2e/              Playwright
docs/             especificação, regras, arquitetura, tasks
```

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm install` | Instala e ativa os git hooks (`.githooks/`) |
| `docker compose up -d` | Sobe o PostgreSQL local (`comicle` e `comicle_test`) |
| `pnpm dev` | Web em `:5173` e servidor em `:3000` |
| `pnpm test` | Testes unitários e de integração (sem banco) |
| `pnpm test:db` | Testes de repositório contra o Postgres |
| `pnpm e2e` | Playwright (a partir da T20) |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Qualidade |
| `pnpm db:generate` · `pnpm db:migrate` | Migrações Drizzle |
| `pnpm avatars:check` | Valida catálogo e artes de avatar |
| `pnpm avatars:generate` | Regera o gabarito das artes de avatar |
| `pnpm --filter @comicle/server <script>` | Script de um pacote só |

Os comandos existem a partir da T01. Antes de dizer que algo funciona, rode-os.

## Regras de arquitetura (não negociáveis)

1. **O servidor é a autoridade.** Fases, prazos, distribuição, revelação e anfitrião são decididos só no servidor. O cliente exibe a `PlayerView` e envia intenções.
2. **Estado por projeção.** Depois de cada mutação, o servidor envia a `PlayerView` completa a cada jogador. Não crie eventos incrementais de estado.
3. **Privacidade é responsabilidade do servidor.** `buildPlayerView` e `PanelAccessPolicy` são os únicos lugares que decidem o que alguém vê. Nunca mande dados "escondidos" para o cliente esconder.
4. **Domínio puro.** Regras de jogo não importam Fastify, Socket.IO, Drizzle, `Date.now()` ou `Math.random()`. Tempo e aleatoriedade são injetados (`Clock`, `Scheduler`, `Rng`).
5. **Uma fila por sala.** Toda mutação de sala passa por `room.runExclusive`.
6. **Handlers finos.** Validam com o schema de `@comicle/shared`, chamam o serviço, respondem `Ack`. Sem regra de negócio.
7. **Contratos em um lugar.** Tipos, schemas e eventos compartilhados vivem em `@comicle/shared`. Mudou o contrato → atualize `docs/protocolo-realtime.md` no mesmo PR.
8. **Componentes não falam com o socket.** Usam ações das stores.
9. **Sem números mágicos.** Constantes de regra vêm de `@comicle/shared/constants`.
10. **Simplicidade.** Monólito modular, instância única, sem Redis, filas, microsserviços, GraphQL ou camadas de abstração sem uso real. Dependência nova só com justificativa no PR e entrada em `docs/decisoes.md`.

## Convenções de código

- Identificadores, nomes de arquivo e comentários de código em **inglês**. Textos de interface em **pt-BR**, todos em `apps/web/src/strings/pt-BR.ts`. Documentação e mensagens de commit em **pt-BR**.
- Arquivos em `kebab-case`; componentes React em `PascalCase` com export nomeado; sem `export default` (exceto onde a ferramenta exige, como configs).
- Sufixos no servidor: `.service.ts`, `.handlers.ts`, `.routes.ts`, `.repository.ts`; arquivos sem sufixo dentro de `modules/` são domínio puro.
- TypeScript estrito: sem `any`, sem `as` para silenciar erro, sem `!` não justificado. Use uniões discriminadas e `switch` exaustivo (`satisfies never`).
- Funções pequenas com nomes que dizem o que fazem. Comentários explicam **por quê**, não **o quê**.
- Erros de domínio: `throw new DomainError('CODE', 'mensagem em pt-BR')`. Nunca exponha stack trace ou detalhes internos ao cliente.
- Logs: pino estruturado; nunca registre tokens, temas, nicknames ou imagens.

### Glossário

| Produto (pt-BR) | Código (en) |
|---|---|
| Jogador / membro / participante / espectador | `player` / `member` / `participant` / `spectator` |
| Anfitrião | `host` |
| Sala · Partida · Rodada | `room` · `match` · `round` |
| Tema · História · Quadrinho (quadro) | `theme` · `story` · `panel` |
| Leitura · Desenho · Fechamento | `reading` · `drawing` · `closing` |
| Apresentação | `presentation` |
| Assento (ordem na partida) | `seat` |
| Rascunho (autosave) | `draft` |

## Testes

- Toda regra `Rnn` tocada tem teste citando o ID no nome: `it('R37: prazo da leitura confirma quem faltou', …)`.
- Domínio puro: testes unitários rápidos e determinísticos (`FakeClock`, `ManualScheduler`, `SeededRng`). Nada de `setTimeout` real ou `sleep`.
- Fluxos de sala e partida: integração com `startTestServer` + `socket.io-client`.
- Repositórios: suíte de contrato em memória (`pnpm test`) e Postgres (`pnpm test:db`).
- Web: comportamento com Testing Library (papéis e textos), não detalhes de implementação.
- Bug corrigido = teste que falhava antes.

## Fluxo de trabalho

Cada task de `docs/tasks/` é **um branch e um PR**. O passo a passo completo está em [`docs/tasks/README.md`](docs/tasks/README.md#fluxo-de-uma-task). Resumo:

1. Branch `task/NN-slug` a partir de `main` atualizada.
2. Ler a task e os documentos indicados; perguntar se houver ambiguidade.
3. Marcar 🟨 no índice, implementar em commits pequenos, rodar todas as verificações.
4. Atualizar docs afetados, marcar ✅ e a checklist da task.
5. `git push` e `gh pr create`. **Não faça merge** e não comece a próxima task sem o usuário pedir.

Use o comando `/task NN` (em `.claude/commands/task.md`) para seguir esse fluxo.

## Git e GitHub

- **Commits sem coautoria.** Nunca adicione `Co-Authored-By`, `Claude-Session`, "Generated with Claude Code", emoji de robô ou qualquer outra atribuição em mensagens de commit, descrições de PR, comentários ou issues. O autor dos commits é apenas a identidade git configurada pelo usuário — não altere `git config user.*`. O hook `.githooks/commit-msg` remove esses trailers se aparecerem, e `.claude/settings.json` desativa a atribuição do Claude Code; ainda assim, não os escreva.
- Mensagens no padrão **Conventional Commits**, descrição em pt-BR no imperativo, primeira linha com até 100 caracteres:
  - tipos: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `perf`, `build`, `ci`, `chore`, `revert`
  - escopos: `web`, `server`, `shared`, `db`, `avatar`, `e2e`, `docs`, `ci`, `repo`, `tasks`
  - exemplo: `feat(server): adiciona transferência de anfitrião por inatividade`
  - corpo opcional explicando o porquê; rodapé `Refs: T08`.
- Um commit = uma mudança coerente que compila e passa nos testes.
- Nunca: `git push --force` em `main`, reescrever histórico publicado, commitar `.env`, segredos, `node_modules`, builds ou arquivos gerados fora do esperado (as migrações do Drizzle **são** versionadas).
- PR: título em Conventional Commits com o número da task (`feat(server): salas multiplayer (T08)`), corpo seguindo `.github/pull_request_template.md`. Merge por squash, feito pelo usuário.

## Definition of Done

- [ ] Critérios de aceite e testes obrigatórios da task atendidos.
- [ ] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` verdes (+ `test:db` / `e2e` quando aplicável).
- [ ] Sem `TODO` novo sem task correspondente; sem código morto ou comentado.
- [ ] Documentação atualizada (regras, protocolo, decisões) se algo mudou.
- [ ] Índice de tasks e checklist atualizados.
- [ ] PR aberto, sem nenhuma linha de atribuição.

## Fora do escopo da v1

Não implemente, mesmo que pareça fácil: contas, login, perfis públicos, pontuação, rankings, conquistas, moedas, loja, matchmaking público, feed, chat, sons, modo Quadrinhos Individuais, editor avançado (camadas, formas, balde), salvar ou compartilhar histórias publicamente, múltiplas instâncias do servidor.
