# T39 — Edição de personagens

**Depende de:** T38 · **Pacotes:** shared, web, server, e2e · **Branch:** `task/39-editor-personagens`

## Objetivo

Permitir posição e tamanho independentes das seis peças editáveis do personagem, preservando a cabeça e perfis antigos.

## Leia antes

- `docs/regras-do-jogo.md` (R2, R4, R9)
- `docs/avatares.md`, `docs/interface.md`, `docs/protocolo-realtime.md`
- PENSHOW `97ce95baed7b1bbc0c18ff31e69189cc54661c29/docs/plano-editor-personagens.md`

## Entregáveis

- [x] Contrato versionado, validação estrita e saneamento local por peça
- [x] Cabelo com procedência registrada e pivôs das artes
- [x] Editor com ponteiro, controles por teclado, restauração e rascunho
- [x] Geometria compartilhada nas prévias, miniaturas e vistas da sala
- [x] Documentação de regras, protocolo, dados e interface

## Critérios de aceite

- [x] A cabeça não pode ser editada e formatos legados são preservados
- [x] Perfil salvo e `room:view` mantêm cabelo e layout na reconexão
- [x] Entrada inválida de layout ou categoria extra é rejeitada
- [x] A composição é recortada em todos os tamanhos

## Testes obrigatórios

- [x] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`
- [x] `pnpm avatars:check && pnpm build`
- [x] `pnpm test:db` e Playwright desktop/celular
