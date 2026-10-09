# Arquitetura

Monólito modular em TypeScript: um frontend (`apps/web`), um servidor (`apps/server`) e um pacote de contratos (`packages/shared`), em um monorepo pnpm. Um único processo Node é a autoridade de todas as salas.

```text
┌──────────────────────── Navegador ────────────────────────┐
│  apps/web (React + Vite + Tailwind)                        │
│  ├─ features/*  telas e componentes                        │
│  ├─ drawing/    editor Canvas 2D (lógica pura + React)     │
│  ├─ stores/     Zustand: sessão, perfil, PlayerView        │
│  └─ lib/        cliente Socket.IO, HTTP, sincronia de tempo│
└───────────────┬───────────────────────────┬────────────────┘
                │ Socket.IO (intenções/ack, │ HTTP (sessão,
                │ room:view)                │ imagens)
┌───────────────▼───────────────────────────▼────────────────┐
│  apps/server (Fastify + Socket.IO)                          │
│  ├─ modules/   domínio + serviços + handlers por domínio    │
│  ├─ platform/  db, realtime, http, clock, scheduler, ids    │
│  └─ estado vivo em memória (RoomRegistry)                   │
└───────────────┬─────────────────────────────────────────────┘
                │ Drizzle
        ┌───────▼────────┐
        │  PostgreSQL     │  conteúdo das partidas (temas, PNGs)
        └────────────────┘
packages/shared: tipos, schemas Zod, eventos tipados, constantes, catálogo de avatares
```

---

## 1. Stack

Versões: a estável mais recente de cada pacote no momento da T01, travadas pelo `pnpm-lock.yaml`. Majors mínimos indicados onde importam.

| Camada | Escolha | Motivo |
|---|---|---|
| Runtime | **Node.js 24 LTS** (`.nvmrc`) | LTS ativo |
| Gerenciador | **pnpm 10** com workspaces (`packageManager` no `package.json` raiz, via Corepack) | Monorepo simples, sem Turborepo/Nx |
| Linguagem | **TypeScript 6.0** ([D16](./decisoes.md)) `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` | Especificação |
| Frontend | **React 19** + **Vite** + **React Router** (modo biblioteca, `createBrowserRouter`) | Especificação |
| Estado no cliente | **Zustand** | Pouco boilerplate; a `PlayerView` é a única fonte do estado do jogo |
| Estilo | **Tailwind CSS 4** (configuração CSS-first com `@theme`) | Especificação |
| Fontes | **@fontsource** auto-hospedado (Bangers para títulos, Nunito para texto) | Sem dependência de CDN; facilita integração com o site |
| Backend | **Fastify 5** + `@fastify/cors`, `@fastify/rate-limit`, `@fastify/helmet`, `@fastify/static` (produção) | Especificação |
| Tempo real | **Socket.IO 4**, anexado a `app.server` (sem plugin de terceiros) | Especificação; reconexão e acks prontos |
| Validação | **Zod 4**, schemas compartilhados em `@comicle/shared` | Um schema valida cliente e servidor |
| Banco | **PostgreSQL 17** (Docker em dev) + **Drizzle ORM** + `drizzle-kit` + driver `pg` | Tipado, leve, migrações SQL versionadas |
| Desenho | **Canvas 2D API** + Pointer Events | Especificação |
| Testes | **Vitest** (unidade e integração), **Testing Library** + jsdom (web), **Playwright** (E2E) | Vitest é da especificação |
| Qualidade | **ESLint** (flat config, `typescript-eslint` com regras type-checked, `react-hooks`) + **Prettier** | Padrão do ecossistema |
| Build do servidor | **tsdown** (empacota `@comicle/shared` dentro do bundle) | O pacote compartilhado exporta TS puro |
| Dev do servidor e scripts | **tsx** (`tsx watch` no servidor; scripts de `apps/web/scripts/`) | Roda o TypeScript do `@comicle/shared` sem build ([D20](./decisoes.md)) |
| Logs | **pino** (embutido no Fastify), `pino-pretty` só em dev | |
| CI | **GitHub Actions** | |

Qualquer dependência fora desta lista precisa de justificativa no PR e de entrada em [decisões](./decisoes.md).

---

## 2. Estrutura do repositório

```text
.
├─ apps/
│  ├─ web/
│  │  ├─ public/avatars/<categoria>/<id>.svg · _template.svg · _template.png
│  │  ├─ scripts/                   # avatars:check, avatars:generate (gabarito) e as regras das artes (avatars/)
│  │  └─ src/
│  │     ├─ main.tsx · app.tsx · router.tsx · app-layout.tsx · boot.ts
│  │     ├─ config/env.ts            # VITE_* validados com Zod
│  │     ├─ lib/                     # socket-client, http-client, time-sync, storage
│  │     ├─ stores/                  # session-store, profile-store, room-store
│  │     ├─ strings/pt-BR.ts         # todos os textos de interface
│  │     ├─ ui/                      # design system: Button, Card, Timer, Dialog…
│  │     └─ features/
│  │        ├─ avatar/               # AvatarRenderer, AvatarEditor, catálogo
│  │        ├─ home/                 # tela inicial, criar/entrar
│  │        ├─ lobby/
│  │        ├─ match/                # roteador de fase + telas de cada fase
│  │        ├─ drawing/              # engine (puro) + DrawingCanvas + Toolbar
│  │        ├─ comic/                # computeComicLayout (puro) + ComicPage
│  │        └─ presentation/
│  └─ server/
│     ├─ drizzle/                    # migrações SQL geradas
│     └─ src/
│        ├─ main.ts                  # composição: config, db, app, listen, shutdown
│        ├─ app.ts                   # buildApp(deps) — usado também nos testes
│        ├─ config/env.ts
│        ├─ platform/
│        │  ├─ clock.ts · scheduler.ts · random.ts · ids.ts · errors.ts
│        │  ├─ db/                   # client, schema, migrate
│        │  ├─ http/                 # auth hook, error handler
│        │  └─ realtime/             # socket-server, auth middleware, defineHandler, rate limit
│        └─ modules/
│           ├─ guest-identity/       # sessões e rotas
│           ├─ rooms/                # Room, RoomRegistry, room-code, host-policy, serviço, handlers
│           ├─ matches/              # máquina de fases, serviço, handlers
│           ├─ game-modes/           # GameMode + collaborative/ (distribuição)
│           ├─ stories/              # repositórios, temas reserva
│           ├─ drawing/              # panel-image, panel-access-policy, rotas de imagem
│           ├─ timing/               # GameTimingConfig (perfis default e fast), time:sync
│           ├─ presentation/         # cursor puro e handlers (o serviço é o MatchService)
│           └─ views/                # buildPlayerView (projeção)
├─ packages/
│  └─ shared/src/
│     ├─ constants.ts · errors.ts · events.ts
│     ├─ domain/                     # tipos: MatchSettings, PlayerView, AvatarConfig…
│     ├─ schemas/                    # Zod
│     └─ avatar/catalog.json + catalog.ts
├─ e2e/                              # Playwright
├─ docker/postgres/init/             # scripts de init do Postgres local (cria comicle_test)
├─ docs/
└─ .claude/ · .githooks/ · .github/
```

Nomes de arquivo em `kebab-case`; componentes React em `PascalCase` dentro de arquivos `kebab-case.tsx` (ex.: `comic-page.tsx` exporta `ComicPage`).

---

## 3. Regras de dependência

1. **`packages/shared`** não importa nada de `apps/*` nem de bibliotecas de runtime além de Zod.
2. **Domínio puro** (arquivos sem sufixo `.service`, `.handlers`, `.routes`, `.repository` dentro de `modules/`) não importa Fastify, Socket.IO, Drizzle, `Date.now()` nem `Math.random()`. Tempo e aleatoriedade chegam por parâmetro (`Clock`, `Rng`).
3. **Handlers** (socket) e **rotas** (HTTP) são finos: validam o payload com o schema de `@comicle/shared`, chamam um serviço, convertem o resultado em `Ack`/resposta. Nenhuma regra de jogo neles.
4. **Serviços** orquestram: pegam a sala, executam a mutação dentro de `room.runExclusive`, persistem, agendam timers e pedem a publicação das views.
5. Módulos se comunicam por chamadas diretas a serviços, nunca acessando estruturas internas uns dos outros. Sem barramento de eventos.
6. **No cliente**, componentes não falam com o socket diretamente: usam ações das stores (`roomStore.actions.submitTheme(text)`), que chamam `lib/socket-client`.
7. O cliente **não contém regra de jogo** além de UX (ex.: desabilitar botão). Tudo que importa é decidido no servidor.

As regras 1, 2 e 6 são garantidas com `no-restricted-imports` do próprio ESLint, configurado por diretório no `eslint.config.js` (sem plugin extra). A regra 6 vale para todo `apps/web/src` fora de `lib/` e `stores/`. No mesmo espírito, `no-restricted-syntax` barra texto literal em JSX (texto solto e `aria-label`, `title`, `alt`, `placeholder` com string fixa) fora dos testes: todo texto vem de `strings/pt-BR.ts`.

---

## 4. Servidor em detalhe

### Composição

`buildApp({ config, clock, scheduler, rng, storyRepository, checkDatabase, timing })` monta Fastify, Socket.IO, registros e serviços, e devolve `{ http, io }`. `main.ts` cria as dependências reais; testes passam `InMemoryStoryRepository`, relógio controlável e `timing` com durações curtas (via `createTestDeps` / `startTestServer` em `apps/server/test/support/`). Testes também podem passar `extraSocketHandlers` (eventos só de teste) e `socketRateLimits`.

Cada handler de socket passa, nesta ordem, por: rate limit da conexão → validação com o schema do evento → handler → `Ack`. A queda de uma conexão chega ao `RoomService` pela opção `onDisconnect` do `createSocketServer`, e os serviços enviam eventos aos sockets pela interface `RoomBroadcaster` (D21).

### Serialização por sala

Cada `Room` tem uma fila assíncrona (`runExclusive(fn)`, encadeamento de promises). **Toda** mutação de uma sala — ação de jogador, disparo de timer, desconexão — passa por ela. Isso evita condições de corrida entre `await`s (ex.: um `panel:submit` chegando durante a persistência da rodada).

### Tempo

- `Clock { now(): number }` — `SystemClock` em produção.
- `Scheduler { schedule(key, at, fn); cancel(key) }` — um timer por chave (`room:<id>:phase`, `room:<id>:host-transfer`…). Reagendar uma chave cancela a anterior. O callback entra na fila da sala.
- `GameTimingConfig` (`modules/timing/game-timing.ts`) agrupa as durações (`themeWritingMs`, `readingMs(roundIndex)`, `drawingMs(settings)`, `roundClosingMs`, graças e TTLs da sala). O perfil `default` usa as constantes de `@comicle/shared`; o `fast` (`GAME_TIMING_PROFILE=fast`, para E2E e testes manuais) encurta só as fases da partida: temas 20 s, leitura 5 s, desenho 20 s, fechamento 1 s. Testes de integração avançam o relógio com o `ManualScheduler`.
- Prazos são instantes absolutos (`phaseDeadlineAt`). Nada conta segundos em loop.

### Máquina de fases

```text
lobby ──start──▶ theme_writing ──▶ round_drawing (r=0) ──▶ round_closing
                                        ▲                      │
                                        │                      ├─ há próxima rodada ─▶ round_reading ─▶ round_drawing …
                                        │                      └─ última rodada ─────▶ presentation ──end──▶ lobby
abort (qualquer fase) ──────────────────────────────────────────────────────────────▶ lobby
```

`modules/matches/match-machine.ts` é puro: `(estado, evento, agora) → { estado, efeitos }`, criado com `createMatchMachine(timing)`. Ids, ordem dos assentos e temas reserva chegam prontos no evento `start` (o serviço os sorteia com o `Rng`), então a máquina não usa aleatoriedade. Efeitos são dados que o `MatchService` executa dentro de `runExclusive`: `schedule_phase` / `cancel_phase` (timer `room:<id>:phase`), `persist_match`, `persist_round`, `set_match_status` (com o id da partida, porque no `presentation_end` a sala já não a tem), `emit_collect` (`round:collect`), `notify_aborted` (`match:aborted`) e `delete_match`. Os ids dos quadros também chegam no `start` (`panelIds[rodada][história]`), então o fechamento resolve e persiste a rodada numa transição só. Presença entra como evento (`presence_changed`, com os conectados): o `RoomService` avisa o `MatchService` a cada saída ou queda, dentro da fila da sala, para a leitura não esperar desconectados (R37). Depois de cada transição o serviço publica as views. Isso deixa as transições testáveis sem rede, banco ou timers reais.

### Modos de jogo

```ts
interface GameMode {
  id: 'collaborative' | 'individual';
  validateSettings(settings: MatchSettings): Result<void>;
  totalRounds(settings: MatchSettings, participantCount: number): number;
  buildPlan(seats: readonly string[], totalRounds: number): DistributionPlan;
  hasReadingPhase(roundIndex: number): boolean;
}
```

`Result<T>` é `{ ok: true; value: T } | { ok: false; error: DomainError }`. O formato de `DistributionPlan` está no [modelo de dados](./modelo-de-dados.md); consulte-o só por `storyForPlayer(plan, r, playerId)` e `playerForStory(plan, r, storyIndex)` (`modules/game-modes/game-mode.ts`). O modo é obtido por `getGameMode(id)` (`modules/game-modes/registry.ts`).

A v1 registra só `collaborative`. O modo individual (v2) entra como nova implementação, sem alterar salas, apresentação ou desenho. Não implemente a v2 antes de a task existir.

### Projeção

`buildPlayerView(room, playerId, now): PlayerView` é pura e é o único lugar que decide o que um jogador vê (R58). O serviço chama `publish(room)` após cada mutação, que envia a view de cada membro conectado ao seu socket.

### Persistência

- Criação da sala → linha em `rooms`.
- Início da partida → só apaga a partida anterior da sala (R25). Fim da etapa de temas → `createMatch` grava `matches`, `themes` e `stories` de uma vez, com `started_at` do início; falha → mais uma tentativa → aborta a partida.
- Fim de cada rodada → `saveRoundPanels` em uma transação; os rascunhos em memória daquela rodada são descartados.
- Falha de banco ao persistir uma rodada (ou os temas): registra o erro, tenta mais uma vez; se falhar, aborta a partida (R57) e avisa os jogadores com `match:aborted { reason: 'persistence_failed' }`. Nunca deixa a partida em estado inconsistente.
- Entrada na apresentação → `setMatchStatus('presenting')`; `presentation:end` → `setMatchStatus('finished')`. Uma falha só é registrada.

---

## 5. Cliente em detalhe

- **Boot** (`boot.ts`): lê `comicle.session`; valida com `GET /api/guest-sessions/me`; se a resposta for 401, cria nova (outras falhas mantêm o token e mostram a faixa de conexão com "Tentar de novo"). Conecta o socket. Mede o deslocamento de tempo a cada conexão e reconexão. Se o socket recusar o token (`connect_error` `UNAUTHORIZED`), a `room-store` pede sessão nova à `session-store` e reconecta.
- **Reconexão**: a `RoomSession` repete o `room:join` a cada (re)conexão; a `room-store` conta as entradas aceitas (`joins`), recusa ações sem conexão e transforma o sumiço da sala em saída `closed`. Botões que mandam ações usam `useOnline()`. Matriz completa em [cenários de reconexão](./cenarios-de-reconexao.md).
- **Envelope único**: `lib/http-client` e `lib/socket-client` sempre resolvem um `Ack` e nunca rejeitam. Falha de rede, resposta fora do schema e ack sem resposta em 10 s (`ACK_TIMEOUT_MS`) viram `INTERNAL`. O texto exibido vem do mapa `errorMessages` de `strings/pt-BR.ts`, pelo código.
- **Rotas**: `/` (início), `/perfil` (personalização), `/sala/:code` (lobby, partida e apresentação são estados da mesma rota, decididos pela `PlayerView`), 404 no estilo do jogo para o resto e `/dev/ui` (vitrine do design system) só em desenvolvimento.
- **`MatchScreen`** escolhe a tela pela `task.kind` e `phase`. Não existe navegação manual entre fases.
- **Editor de desenho** (`features/drawing/engine/`): classes puras para documento de traços, histórico (desfazer/refazer), suavização e exportação; o componente React só conecta eventos de ponteiro e o canvas. Detalhes em [interface](./interface.md#editor-de-desenho).
- **Imagens**: `usePanelImage(panelId)` com `fetch` autenticado e `blob:` URLs.

---

## 6. Configuração

`apps/server/.env` (exemplo em `.env.example`, validado com Zod em `config/env.ts`):

| Variável | Padrão dev | Descrição |
|---|---|---|
| `PORT` | `3000` | |
| `HOST` | `0.0.0.0` | |
| `DATABASE_URL` | `postgres://comicle:comicle@localhost:5432/comicle` | |
| `DATABASE_URL_TEST` | `postgres://comicle:comicle@localhost:5432/comicle_test` | testes `*.db.test.ts` |
| `CORS_ORIGINS` | `http://localhost:5173` | lista separada por vírgula |
| `PUBLIC_BASE_PATH` | `/` | prefixo quando o web é servido pelo servidor |
| `SERVE_WEB_DIST` | vazio | caminho do build do web para servir estático em produção |
| `LOG_LEVEL` | `info` | |
| `TRUST_PROXY` | `false` | `true` atrás de proxy reverso (IP real para rate limit) |
| `GAME_TIMING_PROFILE` | `default` | `default` ou `fast` (durações curtas para E2E e testes manuais); `fast` é recusado quando `NODE_ENV=production` |

`apps/web/.env` (prefixo `VITE_`):

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_SERVER_URL` | vazio (mesma origem) | URL do servidor quando hospedado separado |
| `VITE_BASE_PATH` | `/` | `base` do Vite e `basename` do router |

Em dev, o Vite faz proxy de `/api` e `/socket.io` para `localhost:3000`. A variável de ambiente `API_PROXY_TARGET` (lida pelo `vite.config.ts`, sem prefixo `VITE_`) troca esse destino; a suíte E2E a usa.

---

## 7. Segurança

Verificado na T19 ([D33](./decisoes.md)); os testes ficam em `apps/server/test/integration/security.test.ts`, nas matrizes `privacy-matrix.test.ts` e `image-access-matrix.test.ts` e no teste de propriedade `packages/shared/src/schemas/events.property.test.ts`.

**Validação e robustez**

- Payloads validados com Zod em toda entrada (HTTP e socket). Entrada malformada responde `INVALID_PAYLOAD` (ou o erro de domínio), nunca `INTERNAL`: teste de propriedade com `fast-check` sobre todos os schemas, sobre os 16 eventos em três situações do socket (fora de sala, anfitrião no lobby, participante desenhando) e sobre as rotas HTTP.
- Evento sem callback de ack é ignorado.

**Limites de tamanho**

| O quê | Limite | Efeito |
|---|---|---|
| Campo de texto bruto (apelido, tema, rascunho, código, `playerId`) | `TEXT_INPUT_MAX_LENGTH` (1000), antes da normalização | `INVALID_PAYLOAD` |
| Apelido e tema, depois de normalizar | `NICKNAME_MAX_LENGTH` (20) e `THEME_MAX_LENGTH` (140) code points | `INVALID_PAYLOAD` |
| Imagem | `PANEL_MAX_BYTES` (2 MiB), PNG `PANEL_WIDTH` × `PANEL_HEIGHT` | `IMAGE_TOO_LARGE` ou `IMAGE_INVALID` |
| Mensagem do Socket.IO | `maxHttpBufferSize` 3 MiB | a conexão de quem mandou cai |
| Anexos binários por pacote | 10 (limite do parser do Socket.IO) | a conexão de quem mandou cai |
| Corpo HTTP | 1 MiB (padrão do Fastify); só `POST /api/guest-sessions` aceita corpo, e o ignora | `INVALID_PAYLOAD` |

**Limites de taxa** (todos com teste)

| Categoria | Limite | Resposta |
|---|---|---|
| `POST /api/guest-sessions` | 10/min por IP | `429 RATE_LIMITED` |
| `GET /api/rooms/:code` (varredura de códigos) | 30/min por IP | `429 RATE_LIMITED` |
| Eventos do socket | 20/s por conexão (token bucket) | `RATE_LIMITED` |
| `panel:autosave` | 1 a cada 2 s por conexão | `RATE_LIMITED` |
| `room:join` com falha (varredura de códigos) | 10/min por IP, somando as conexões | `RATE_LIMITED`, até para o código certo, até repor |

Atrás de um proxy reverso, com `TRUST_PROXY=true`, o IP vem do `X-Forwarded-For` (HTTP e socket).

**Autorização e privacidade**

- Autorização centralizada: `host-policy.ts` (ações de anfitrião) e `panel-access-policy.ts` (imagens), ambos puros e testados. Matriz: cada ação exclusiva do anfitrião × anfitrião, membro, espectador e não membro, no lobby e na apresentação; só o anfitrião age, e nada muda quando outro tenta.
- Privacidade (R58): matriz sobre partidas geradas pela máquina de fases (2 a 5 jogadores, todas as fases, navegação aleatória na apresentação). Nenhuma `PlayerView` contém tema ou quadro além do permitido; mutações na projeção confirmaram que a matriz acusa o vazamento.
- Imagens (R59): matriz sobre as mesmas partidas, todo `panelId` (desenhado ou não) × todo jogador e espectador × todo momento. Quem não é membro da sala recebe 403 mesmo para um quadro revelado (`DrawingService`).

**Cabeçalhos**

- `@fastify/helmet` com as opções de `platform/http/security-headers.ts`: os padrões (`default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`…), `img-src 'self' data: blob:` (imagens dos quadros e rascunho do desenho chegam por URLs `blob:`) e sem `upgrade-insecure-requests` (quebraria uma instalação servida em HTTP simples). Validado com o build de produção do web servido com esses cabeçalhos: uma partida completa, com WebSocket e imagens, sem nenhuma mensagem no console.

**Logs**

- Tokens só em hash no servidor; nunca em logs, URLs ou mensagens de erro.
- `pino.redact` cobre autorização, cookies, tokens, imagens (`png`), temas (`text`, `themeText`) e apelidos.
- Erros passam pelo serializador de `platform/log-safety.ts`: tipo, código (SQLSTATE), a primeira linha da mensagem sem os `params:` do Drizzle e a pilha; nada do `detail` do pg nem de propriedades extras. Teste de ponta a ponta com o banco falhando: nenhum log contém token, tema, apelido ou imagem.

**Interface**

- Conteúdo de usuário (nicknames, temas) é sempre renderizado como texto; nada de `dangerouslySetInnerHTML`.
- Limitação conhecida: é impossível impedir que um jogador guarde uma imagem já exibida no próprio navegador. O jogo garante que o servidor e a interface não a forneçam fora das regras (R36, R59).

---

## 8. Testes

| Tipo | Onde | Ferramenta | Roda em |
|---|---|---|---|
| Unidade de domínio | `*.test.ts` ao lado do código | Vitest | `pnpm test` |
| Integração realtime | `apps/server/test/integration/*.test.ts` — `buildApp` + `socket.io-client` + repositório em memória + `timing` curto | Vitest | `pnpm test` |
| Repositórios | `*.db.test.ts` contra Postgres real | Vitest | `pnpm test:db` (CI com serviço Postgres) |
| Componentes web | `*.test.tsx` | Vitest + Testing Library + jsdom | `pnpm test` |
| Ponta a ponta | `e2e/*.spec.ts`, um contexto de navegador por jogador | Playwright (Chromium) | `pnpm e2e` (job `e2e` no CI, com Postgres como serviço) |

Diretrizes:

- Cada regra `Rnn` de [regras do jogo](./regras-do-jogo.md) tem pelo menos um teste que cita o ID no nome.
- Teste comportamento observável (view publicada, ack, resposta HTTP), não detalhes internos.
- Sem `sleep` com tempo real em testes de domínio: use relógio e scheduler controláveis ou `vi.useFakeTimers()`.
- Snapshots só para dados pequenos e estáveis; nunca para árvores de componentes inteiras.

**Suíte E2E** (T20, D35). `pnpm e2e` sobe sozinho dois processos (`webServer` do `playwright.config.ts`): o servidor em `:3100` com `GAME_TIMING_PROFILE=fast` e o banco `comicle_test`, e o **build de produção** do web em `:5273` (`vite preview`, com proxy para o servidor). As portas são diferentes das de `pnpm dev`, então os dois convivem. Pré-requisitos locais: `docker compose up -d` e, uma vez, `pnpm exec playwright install chromium`.

- Cada jogador é um `browser.newContext()` (`localStorage` e sessão próprios); os helpers ficam em `e2e/support/` (`createPlayer`, `createRoom`, `drawSomething`, `advanceUntilPhase`…). Seletores por papel e texto acessível, com os textos vindos de `strings/pt-BR.ts`.
- O servidor E2E roda com `TRUST_PROXY=true` e cada jogador manda um `X-Forwarded-For` próprio: os limites por IP da T19 (10 sessões e 10 `room:join` com falha por minuto) valem para o jogador, não para a suíte inteira.
- Em falha, o CI publica o relatório HTML (`playwright-report/`) e os traces (`test-results/`).

---

## 9. Produção e integração com o site

- Um container: o servidor serve a API, o Socket.IO e, se `SERVE_WEB_DIST` estiver definido, o build estático do web sob `PUBLIC_BASE_PATH` (com fallback para `index.html`).
- Alternativa: hospedar o web no site principal (build com `VITE_BASE_PATH=/jogos/quadrinhos/` e `VITE_SERVER_URL` apontando para o servidor) e liberar a origem em `CORS_ORIGINS`.
- O jogo não depende de contas do site; mantém as próprias sessões de convidado.
- Instância única (estado em memória). Escalar horizontalmente exigiria adaptador Redis do Socket.IO e estado compartilhado — fora do escopo da v1 ([D2](./decisoes.md)).
- Desligamento gracioso: em `SIGTERM`, para de aceitar conexões, avisa os clientes e fecha o pool do banco.
