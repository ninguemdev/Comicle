# T22 — Produção e deploy

**Depende de:** T19 · **Pacotes:** raiz, server, web · **Branch:** `task/22-producao-deploy`

## Objetivo
Imagem de produção única, configurável para rodar sozinha ou integrada a um site existente, com documentação de deploy.

## Leia antes
- `docs/arquitetura.md` §6, §9
- `docs/especificacao-produto.md` §2, §14.4

## Entregáveis
- [x] `Dockerfile` multi-stage: instala com pnpm, builda shared/web/server, imagem final `node:24-slim` com usuário não root, só artefatos de produção, `HEALTHCHECK` em `/healthz`.
- [x] Servidor serve o build do web via `@fastify/static` quando `SERVE_WEB_DIST` está definido, sob `PUBLIC_BASE_PATH`, com fallback para `index.html` nas rotas do cliente e cache longo nos assets com hash.
- [x] `docker-compose.prod.yml` de exemplo (app + Postgres com volume).
- [x] `docs/deploy.md`: variáveis de ambiente, exemplo de proxy reverso (nginx) com upgrade de WebSocket e `TRUST_PROXY`, integração com o site principal (build com `VITE_BASE_PATH` e `VITE_SERVER_URL`, `CORS_ORIGINS`), backup (desnecessário: dados temporários), observabilidade (logs JSON do pino).
- [x] Workflow opcional `.github/workflows/release.yml`: em tag `v*`, builda e publica a imagem no GHCR.
- [x] `README.md` atualizado com a seção de deploy.

## Critérios de aceite
- [x] `docker compose -f docker-compose.prod.yml up` sobe o jogo completo acessível em `http://localhost:3000`.
- [x] Build com `VITE_BASE_PATH=/jogos/quadrinhos/` e `PUBLIC_BASE_PATH=/jogos/quadrinhos/` funciona, inclusive recarregando em `/jogos/quadrinhos/sala/XXXXXX`.
- [x] `SIGTERM` encerra em menos de 10 s sem erros.

## Testes obrigatórios
- [x] Teste do servidor servindo estáticos com base path e fallback.
- [x] Smoke test no CI: build da imagem e `curl /healthz` no container.
