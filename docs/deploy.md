# Deploy

Como colocar o Comicle no ar: sozinho num servidor ou integrado a um site que já existe. Complementa a [arquitetura §6 e §9](./arquitetura.md#9-produção-e-integração-com-o-site).

---

## 1. Visão geral

- **Um container** com o servidor Node: API HTTP (`/api`), Socket.IO (`/socket.io`), `/healthz` e, por padrão, o build do web.
- **Um PostgreSQL 17**, só para o conteúdo das partidas em andamento.
- **Uma instância só.** O estado das salas vive em memória ([D2](./decisoes.md)): não rode duas réplicas atrás de um balanceador.

A imagem é construída pelo [`Dockerfile`](../Dockerfile) da raiz: instala com pnpm, builda `@comicle/shared`, o web e o servidor, e a imagem final (`node:24-slim`, usuário `node`, sem root) leva só o bundle do servidor, as dependências de produção, as migrações e o build do web. As migrações rodam sozinhas a cada início.

## 2. Subindo com Docker Compose

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

O jogo fica em `http://localhost:3000`. O [`docker-compose.prod.yml`](../docker-compose.prod.yml) é um exemplo: o app e o Postgres com volume, num projeto (`comicle-prod`) separado do banco de desenvolvimento. Antes de usar fora da sua máquina, defina `POSTGRES_PASSWORD` (num `.env` ao lado do arquivo ou no ambiente) e ponha um proxy reverso com HTTPS na frente (§4).

Imagem pronta: cada tag `v*` publica `ghcr.io/ninguemdev/comicle` (`latest`, `1.2.3`, `1.2`) pelo workflow [`release.yml`](../.github/workflows/release.yml). Ela serve o web na raiz do domínio; para outro caminho ou servidor separado, builde a sua (§3).

## 3. Configuração

### Em tempo de build (web)

O build do web fixa onde ele vai morar e onde está o servidor. Mudou um desses, builde outra imagem:

```bash
docker build -t comicle --build-arg VITE_BASE_PATH=/jogos/quadrinhos/ .
```

| Build arg | Padrão | Descrição |
|---|---|---|
| `VITE_BASE_PATH` | `/` | Caminho do jogo no domínio, com a barra final. Precisa ser igual ao `PUBLIC_BASE_PATH` quando o container serve o web |
| `VITE_SERVER_URL` | vazio | URL do servidor quando o web é hospedado em outro lugar (§5, opção B). Vazio = mesma origem da página |

### Em tempo de execução (servidor)

| Variável | Na imagem | Descrição |
|---|---|---|
| `DATABASE_URL` | — (**obrigatória**) | `postgres://usuario:senha@host:5432/banco` |
| `NODE_ENV` | `production` | Desliga o log colorido e recusa `GAME_TIMING_PROFILE=fast` |
| `PORT` · `HOST` | `3000` · `0.0.0.0` | Onde o servidor escuta |
| `SERVE_WEB_DIST` | `/app/web` | Build do web servido pelo container. Vazio (`SERVE_WEB_DIST=`) desliga, para quando o web mora em outro lugar |
| `PUBLIC_BASE_PATH` | `/` | Caminho em que o container serve o web. A API, o Socket.IO e o `/healthz` ficam sempre na raiz |
| `TRUST_PROXY` | `false` | `true` atrás de proxy reverso: os limites por IP passam a ver o IP do jogador (`X-Forwarded-For`), não o do proxy |
| `CORS_ORIGINS` | `http://localhost:5173` | Origens de outro domínio que podem chamar a API e o Socket.IO, separadas por vírgula. Só importa na opção B do §5 |
| `LOG_LEVEL` | `info` | `warn` tira o log de cada requisição |
| `GAME_TIMING_PROFILE` | `default` | Não mude em produção (`fast` é recusado) |

O servidor serve o web com cache longo (`immutable`, um ano) nos arquivos de `assets/`, que têm hash no nome, e revalidação (`no-cache`) no resto. Qualquer caminho sem extensão dentro do `PUBLIC_BASE_PATH` recebe o `index.html`, então recarregar em `/sala/K7PQ2M` funciona.

## 4. Proxy reverso (nginx)

O Socket.IO usa WebSocket: o proxy precisa repassar o `Upgrade`. Com o proxy na frente, rode o container com `TRUST_PROXY=true`.

Jogo na raiz de um domínio próprio (`https://comicle.exemplo.com`):

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 443 ssl;
  server_name comicle.exemplo.com;
  # ssl_certificate …; ssl_certificate_key …;

  # Quadros (até 2 MiB) vão pelo Socket.IO, que aceita até 3 MiB quando cai para long-polling.
  client_max_body_size 4m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    # Conexões do Socket.IO ficam abertas a partida inteira.
    proxy_read_timeout 1h;
  }
}
```

`X-Forwarded-For` precisa vir do proxy, não do navegador: com `TRUST_PROXY=true`, o servidor confia no cabeçalho, então o container não deve ficar exposto direto na internet.

## 5. Integração com o site principal

O jogo não usa as contas do site; mantém as próprias sessões de convidado. Há dois jeitos de pô-lo numa seção do site, como `https://www.exemplo.com/jogos/quadrinhos/`.

### Opção A — o container serve tudo, atrás do mesmo nginx do site

Builde com `VITE_BASE_PATH=/jogos/quadrinhos/` e rode com `PUBLIC_BASE_PATH=/jogos/quadrinhos/` e `TRUST_PROXY=true`. No `server` do site, mande ao container o caminho do jogo e os caminhos do servidor, sem cortar o prefixo:

```nginx
location /jogos/quadrinhos/ { proxy_pass http://127.0.0.1:3000; include comicle-proxy.conf; }
location /api/               { proxy_pass http://127.0.0.1:3000; include comicle-proxy.conf; }
location /socket.io/         { proxy_pass http://127.0.0.1:3000; include comicle-proxy.conf; }
```

(`comicle-proxy.conf` com as linhas `proxy_*` do §4.) Como a API e o Socket.IO ficam na raiz, esta opção só serve se o site não usa `/api/` nem `/socket.io/`. Se usa, vá de opção B.

### Opção B — o site hospeda o web, o jogo roda num subdomínio

1. Builde só o web com o endereço do servidor:

   ```bash
   VITE_BASE_PATH=/jogos/quadrinhos/ VITE_SERVER_URL=https://jogo.exemplo.com pnpm --filter @comicle/web build
   ```

2. Publique `apps/web/dist/` no site em `/jogos/quadrinhos/`, com fallback para o `index.html` nos caminhos sem extensão (no nginx: `try_files $uri /jogos/quadrinhos/index.html;`).
3. Rode o container em `https://jogo.exemplo.com` (§4) com `SERVE_WEB_DIST=` (vazio) e `CORS_ORIGINS=https://www.exemplo.com`.
4. Se o site tem CSP, ela precisa liberar `connect-src https://jogo.exemplo.com wss://jogo.exemplo.com` e `img-src blob: data:` (quadros e avatares).

## 6. Atualização e desligamento

- Em `SIGTERM` (`docker stop`, `docker compose down`), o servidor para de aceitar conexões, desconecta os jogadores, fecha o banco e sai com código 0, em bem menos que os 10 s do `stop_grace_period`. O CI confere isso a cada PR (job `docker`).
- **Um reinício encerra todas as salas** (R17): o estado vivo está em memória, e o boot apaga do banco o conteúdo das salas que estavam abertas. Atualize quando ninguém estiver jogando.

## 7. Backup

Desnecessário. O banco só guarda o conteúdo das partidas em andamento, apagado no fim de cada sala, a cada nova partida e a cada reinício ([retenção](./modelo-de-dados.md#3-retenção)); não existe biblioteca de histórias. Perder o volume só afeta as partidas daquele momento, que um reinício já encerraria. O volume do compose existe para o Postgres não recriar o banco do zero a cada atualização da imagem.

## 8. Observabilidade

- **Logs:** JSON do pino, uma linha por evento, na saída padrão (`docker logs`, ou o coletor da sua plataforma). Campos úteis: `level` (30 = info, 40 = warn, 50 = error), `time` (ms epoch), `msg`, `reqId`, `err` (tipo, código, primeira linha da mensagem e pilha, sem parâmetros de query). Os logs nunca têm tokens, temas, apelidos nem imagens.
- **Saúde:** `GET /healthz` responde `200 {"status":"ok"}` quando o banco responde e `503` quando não. O `HEALTHCHECK` da imagem usa a mesma rota, a cada 15 s.
- **Volume de log:** com `LOG_LEVEL=info`, cada requisição gera duas linhas (inclusive o healthcheck); `warn` deixa só os problemas.

## 9. Instalação de referência: `dionel.site/comicle`

A instalação do criador do projeto, pela opção A do §5. O portfólio continua no Cloudflare Pages; uma EC2 roda só o jogo; a Cloudflare manda à EC2 apenas os caminhos do jogo.

```text
navegador ──https──▶ Cloudflare (dionel.site)
                       ├─ /comicle, /comicle/*, /api/*, /socket.io/* ─▶ Worker ─▶ comicle-origin.dionel.site
                       │                                                         └─ EC2: Caddy :443 ─▶ app:3000 ─▶ postgres
                       └─ o resto ─▶ Cloudflare Pages (portfólio)
```

**Na EC2 não se compila nada.** Ela tem só Docker Engine e Compose (repositório oficial da Docker), rotação de log do Docker (`/etc/docker/daemon.json`: 10 MB × 3) e 2 GiB de swap com `vm.swappiness=10`, porque a `t3.small` tem 2 GiB de RAM. É administrada pelo AWS Systems Manager, sem SSH; o security group só abre 80 e 443.

### Imagem

O workflow [`publish.yml`](../.github/workflows/publish.yml) roda a cada push na `main`: builda com `VITE_BASE_PATH=/comicle/`, testa a imagem (`/healthz`, `/comicle/sala/…` com os assets em `/comicle/assets/`, nada fora de `/comicle/`) e publica `ghcr.io/ninguemdev/comicle-dionel:sha-<commit>`. Publicar não é instalar: a máquina só muda de versão quando alguém troca a tag no `.env`. O pacote precisa ser público no GHCR (configuração do pacote no GitHub) para a máquina baixar sem login.

### Arquivos da máquina (`/opt/comicle`, `root`, `0750`)

| Arquivo | Origem |
|---|---|
| `compose.yaml` | [`infra/ec2/compose.yaml`](../infra/ec2/compose.yaml) |
| `Caddyfile` | [`infra/ec2/Caddyfile`](../infra/ec2/Caddyfile) |
| `.env` (`0600`) | [`infra/ec2/.env.example`](../infra/ec2/.env.example) preenchido: `COMICLE_IMAGE`, `ORIGIN_HOST`, `POSTGRES_PASSWORD` (`openssl rand -hex 32`) |
| `certs/origin.key` (`0600`) · `certs/origin.pem` | Certificado Cloudflare Origin CA (abaixo) |

O compose não sobe sem as três variáveis. App e Postgres não publicam porta; só o Caddy ouve 80 e 443. O Caddy responde 403 a quem não é da Cloudflare (nem da própria máquina), repassa só os caminhos do jogo e troca o `X-Forwarded-For` pelo `CF-Connecting-IP`, que a Cloudflare preenche e o navegador não consegue forjar; por isso o app roda com `TRUST_PROXY=true`.

### Certificado da origem

A chave é gerada na própria máquina e nunca sai dela:

```bash
cd /opt/comicle && install -d -m 0750 certs
openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
  -subj /CN=comicle-origin.dionel.site -keyout certs/origin.key -out origin.csr
chmod 600 certs/origin.key
```

Na Cloudflare: **SSL/TLS → Origin Server → Create Certificate → Use my private key and CSR**, cole o `origin.csr`, hostname `comicle-origin.dionel.site`. Salve o certificado devolvido em `certs/origin.pem`. Ele só é aceito pela Cloudflare, o que basta: ninguém mais fala com a origem.

### Cloudflare

1. DNS: registro `A` `comicle-origin` → Elastic IP da EC2, com proxy (nuvem laranja).
2. SSL/TLS da zona em **Full (strict)**. O portfólio no Pages não é afetado: ele não tem origem própria.
3. Worker [`infra/cloudflare/worker.js`](../infra/cloudflare/worker.js) com as rotas `dionel.site/comicle`, `dionel.site/comicle/*`, `dionel.site/api/*` e `dionel.site/socket.io/*`. Antes de ativar as rotas, confirme na Cloudflare que elas passam na frente do domínio do Pages (teste com uma rota só) e que o portfólio não usa esses caminhos (hoje o Pages responde o próprio `index.html` neles).

Desfazer é tirar as rotas do Worker: o portfólio volta a responder tudo.

### Atualizar e voltar

```bash
cd /opt/comicle
grep COMICLE_IMAGE .env            # anote a tag atual: é o rollback
# troque a tag no .env pela do commit novo (Actions → Publish)
docker compose pull app && docker compose up -d app
docker compose ps && curl -fsk --resolve "comicle-origin.dionel.site:443:127.0.0.1" \
  https://comicle-origin.dionel.site/comicle/ -o /dev/null && echo ok
```

Voltar é o mesmo com a tag anterior. Lembre do §6: trocar a versão encerra as salas abertas. Nunca rode `docker compose down -v`, que apaga o volume do Postgres (sem perda real, §7, mas sem motivo).
