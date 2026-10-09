# T23 — Publicação em dionel.site/comicle (EC2)

**Depende de:** T22 · **Pacotes:** raiz · **Branch:** `task/23-publicacao-ec2`

## Objetivo
Deixar pronto, no repositório, tudo o que a instalação de `https://dionel.site/comicle/` precisa: uma imagem publicada com o caminho `/comicle/` e o runtime da máquina (app, Postgres e proxy de origem). A máquina só baixa imagens prontas; nada é compilado nela.

## Leia antes
- `docs/deploy.md` (inteiro)
- `docs/decisoes.md` D37

## Contexto
- O `dionel.site` está na Cloudflare (DNS com proxy), e o portfólio é servido por ela; ele continua lá. A Cloudflare encaminha ao Comicle só `/comicle`, `/comicle/*`, `/api/*` e `/socket.io/*` (opção A do deploy §5: o portfólio não usa `/api` nem `/socket.io`).
- A máquina é uma EC2 Ubuntu 24.04 (`t3.small`, 2 GiB + 2 GiB de swap) com Docker Engine e Compose, administrada pelo SSM, com só 80/443 abertos.

## Entregáveis
- [x] Workflow `.github/workflows/publish.yml`: a cada push na `main` (ou manualmente), builda a imagem com `VITE_BASE_PATH=/comicle/`, faz um smoke test com `PUBLIC_BASE_PATH=/comicle/` e publica `ghcr.io/ninguemdev/comicle-dionel:sha-<commit>`. Não faz deploy.
- [x] `infra/ec2/compose.yaml`: app (imagem por tag do commit, sem porta publicada), Postgres 17 (sem porta publicada, senha obrigatória) e Caddy (80/443), com volumes e healthchecks.
- [x] `infra/ec2/Caddyfile`: origem HTTPS com certificado Cloudflare Origin CA; aceita só a Cloudflare (e a própria máquina); repassa só os caminhos do jogo; o IP do jogador vem do `CF-Connecting-IP`.
- [x] `infra/ec2/.env.example` sem segredos.
- [x] `docs/deploy.md` §9: instalação de referência, passo a passo de máquina, certificado, Cloudflare, atualização e rollback.
- [x] Job `docker` do CI valida o compose e o Caddyfile.

## Critérios de aceite
- [x] O smoke test do workflow responde `/healthz`, serve `/comicle/sala/K7PQ2M` com o `index.html` e os assets em `/comicle/assets/`, e não serve o jogo fora de `/comicle/`.
- [x] `docker compose config` recusa o compose sem `COMICLE_IMAGE`, `POSTGRES_PASSWORD` ou `ORIGIN_HOST`.
- [x] `caddy validate` aceita o Caddyfile.

## Testes obrigatórios
- [x] Smoke test da imagem `/comicle/` no workflow de publicação.
- [x] Validação do compose e do Caddyfile no CI.
