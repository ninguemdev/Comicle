# Comicle

Jogo multiplayer de navegador para criar **histórias em quadrinhos coletivas** com os amigos.

Cada jogador escreve uma ideia. As histórias circulam pela sala em rodadas: você lê os quadros que vieram antes, memoriza, confirma e desenha a continuação **sem poder olhar de novo**. No fim, o anfitrião revela cada história quadro a quadro e depois como uma página de HQ completa. Sem cadastro e sem pontuação: a graça é ver como a memória imperfeita do grupo transforma as histórias.

**Jogue agora:** [dionel.site/comicle](https://dionel.site/comicle/)

---

## Como funciona uma partida

1. Alguém cria uma sala e manda o link de convite (ou o código de 6 letras).
2. Cada jogador escolhe um nickname e monta o avatar.
3. O anfitrião configura a partida: quantos quadros cada história terá, o tempo por quadro (de 30 s a 10 min) e as opções da sala.
4. Todos escrevem um tema, como "Um gato decide se candidatar à presidência".
5. Rodada a rodada, cada história passa para outra pessoa, que lê os quadros anteriores e desenha o próximo.
6. Na apresentação, o anfitrião conduz a revelação para todos ao mesmo tempo, e cada um pode baixar a HQ como imagem.

Regras completas em [`docs/regras-do-jogo.md`](docs/regras-do-jogo.md).

## Funcionalidades

- **Salas sem cadastro**, com convite por link, até 12 pessoas e espectadores para quem chega no meio da partida.
- **Avatares** montados em seis categorias, guardados no navegador.
- **Editor de desenho** com pincel de espessura e opacidade ajustáveis, borracha, balde de tinta, 16 cores mais cor livre, desfazer e refazer. Funciona com mouse, toque e caneta.
- **Opções da partida:** quantidade de quadros fixa ou um por jogador; o autor desenhar ou não o último quadro da própria história; mostrar os quadros anteriores em miniatura enquanto desenha, em vez de depender só da memória.
- **Reconexão:** cair, recarregar ou trocar de aba não tira ninguém da partida; o desenho em andamento volta de onde parou.
- **Apresentação** conduzida pelo anfitrião, com revelação quadro a quadro, a HQ completa e o download em PNG.
- **Sons** gerados no próprio navegador, com volume e opção de silenciar na tela inicial.
- **Modo escuro**, acessibilidade por teclado e leitor de tela, layout para celular e computador.

## Status

- **Versão 1:** completa e no ar.
- **Versão 1.1:** em andamento. Os sons já estão prontos; o modo **Quadrinhos Individuais**, em que cada jogador desenha uma história inteira sozinho, está planejado.

O andamento de cada parte está em [`docs/tasks`](docs/tasks/README.md).

---

## Rodando na sua máquina

Há dois jeitos: só para **jogar** (com Docker, sem instalar Node) ou para **desenvolver**.

### Só para jogar (Docker)

Pré-requisitos: [Git](https://git-scm.com/) e [Docker](https://docs.docker.com/get-docker/) com Docker Compose.

```bash
git clone https://github.com/ninguemdev/Comicle.git
cd Comicle
docker compose -f docker-compose.prod.yml up -d --build
```

Abra **http://localhost:3000**. O primeiro build leva alguns minutos; o banco de dados (PostgreSQL) sobe junto, e as migrações rodam sozinhas.

**Jogar com outras pessoas na mesma rede (Wi-Fi):** descubra o IP da sua máquina na rede (`ipconfig` no Windows, `ip addr` no Linux, `ipconfig getifaddr en0` no macOS) e mande para os amigos o endereço `http://SEU-IP:3000`. Se o firewall perguntar, libere a porta 3000. Sem HTTPS, o botão **Copiar convite** pode não funcionar em alguns navegadores; o link continua visível na tela para copiar à mão.

Para parar: `docker compose -f docker-compose.prod.yml down`. Para atualizar depois de um `git pull`, rode o mesmo `up -d --build`.

### Para desenvolver

Pré-requisitos:

- [Node.js 24](https://nodejs.org/) (o repositório tem `.nvmrc`: `nvm use`)
- pnpm 10, que vem com o Node pelo Corepack: `corepack enable`
- Docker, para o PostgreSQL de desenvolvimento

```bash
git clone https://github.com/ninguemdev/Comicle.git
cd Comicle
pnpm install                                   # dependências e git hooks
docker compose up -d                           # PostgreSQL (bancos comicle e comicle_test)
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
pnpm db:migrate
pnpm dev                                       # web: http://localhost:5173 · servidor: http://localhost:3000
```

Abra **http://localhost:5173**. Para simular vários jogadores, use janelas anônimas ou navegadores diferentes; para testar no celular, abra o endereço da sua máquina na rede (o Vite já escuta na rede local).

Em desenvolvimento existem páginas para testar partes isoladas: `/dev/ui` (componentes), `/dev/editor` (editor de desenho), `/dev/comic` (páginas de HQ de exemplo) e `/dev/sons` (cada som do jogo).

#### Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Web e servidor com recarga automática |
| `pnpm test` | Testes unitários e de integração (sem banco) |
| `pnpm test:db` | Testes de repositório contra o PostgreSQL |
| `pnpm e2e` | Testes ponta a ponta com Playwright (antes, uma vez: `pnpm exec playwright install chromium`) |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Qualidade do código |
| `pnpm db:generate` · `pnpm db:migrate` | Migrações do banco (Drizzle) |
| `pnpm avatars:check` · `pnpm avatars:generate` | Valida o catálogo de avatares e regera o gabarito das artes |

## Publicando num servidor

A imagem Docker do [`Dockerfile`](Dockerfile) leva o servidor e o site prontos; basta um PostgreSQL ao lado, como no [`docker-compose.prod.yml`](docker-compose.prod.yml). Antes de expor na internet, defina uma senha forte em `POSTGRES_PASSWORD` e coloque um proxy reverso com HTTPS na frente, com suporte a WebSocket.

O guia completo está em [`docs/deploy.md`](docs/deploy.md). Ele cobre as variáveis de ambiente, nginx, como servir o jogo num caminho de um site existente (como `/comicle/`) e a instalação de referência em EC2 com Cloudflare.

---

## Stack

| | |
|---|---|
| Linguagem | TypeScript (estrito) |
| Cliente | React 19, Vite, Tailwind CSS 4, Zustand, Canvas 2D, Web Audio |
| Servidor | Node.js 24, Fastify 5, Socket.IO 4 |
| Contratos | Zod 4 num pacote compartilhado |
| Banco | PostgreSQL 17 + Drizzle ORM |
| Testes | Vitest, Testing Library, Playwright |
| Monorepo | pnpm workspaces |

O servidor é a autoridade do jogo: fases, prazos, quem desenha o quê e o que cada jogador pode ver são decididos lá, e cada cliente recebe só a própria visão da partida. Os motivos de cada escolha estão em [`docs/arquitetura.md`](docs/arquitetura.md) e [`docs/decisoes.md`](docs/decisoes.md).

## Estrutura

```text
apps/web          cliente React
apps/server       servidor Fastify + Socket.IO
packages/shared   tipos, schemas, eventos e constantes compartilhados
e2e/              testes ponta a ponta (Playwright)
infra/            arquivos da instalação de referência (EC2, Cloudflare)
docs/             especificação, regras, arquitetura e tasks
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [Especificação de produto](docs/especificacao-produto.md) | Visão completa do jogo |
| [Regras do jogo](docs/regras-do-jogo.md) | Regras numeradas, constantes e casos de borda |
| [Protocolo](docs/protocolo-realtime.md) | HTTP, eventos Socket.IO e a visão de cada jogador |
| [Modelo de dados](docs/modelo-de-dados.md) | Memória, PostgreSQL e retenção |
| [Arquitetura](docs/arquitetura.md) | Stack, camadas, configuração, testes, produção |
| [Interface](docs/interface.md) | Identidade visual, telas, página de HQ, editor |
| [Sons](docs/sons.md) | Catálogo de sons, quando tocam e volume |
| [Avatares](docs/avatares.md) | Catálogo, renderização e artes |
| [Guia de artes dos avatares](docs/avatares-guia-de-artes.md) | Estilo, tamanhos, gabarito e zonas para desenhar as artes |
| [Reconexão](docs/cenarios-de-reconexao.md) | Quedas, recarregamentos e reinícios em cada fase |
| [Deploy](docs/deploy.md) | Imagem, variáveis, proxy reverso e publicação |
| [Decisões](docs/decisoes.md) | Registro das decisões e seus motivos |
| [Tasks](docs/tasks/README.md) | Backlog e status |

## Licença

Distribuído sob a **licença MIT**: pode usar, copiar, modificar e distribuir, inclusive comercialmente, desde que mantenha o aviso de copyright e a licença. O texto completo está em [`LICENSE`](LICENSE).
