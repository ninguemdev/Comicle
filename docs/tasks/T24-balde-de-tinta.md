# T24 — Balde de tinta

**Depende de:** T13 · **Pacotes:** web · **Branch:** `task/24-balde-de-tinta`

## Objetivo
Uma ferramenta de balde no editor de desenho: um clique pinta a área fechada em volta com a cor escolhida.

## Leia antes
- `docs/interface.md` §4
- `docs/decisoes.md` D25

## Entregáveis
- [x] `engine/flood-fill.ts`: preenchimento puro sobre pixels RGBA, com tolerância e borda de 1 px.
- [x] Operação `fill` no `DrawingDocument` (desfazer, refazer, R40) e no renderer.
- [x] Botão **Balde de tinta (G)** na barra, atalho `G`; escolher cor mantém o balde.
- [x] `interface.md` §4, `especificacao-produto.md` §6.6, D39, escopo no `AGENTS.md`.

## Critérios de aceite
- [x] Num navegador real, o balde dentro de um quadrado fechado pinta só o interior, sem halo junto ao traço, e desfaz com `Ctrl+Z`.
- [x] Export e autosave levam o preenchimento.

## Testes obrigatórios
- [x] Unitários do preenchimento (área fechada, borda suavizada, vazamento por abertura, mesma cor, fora da tela).
- [x] Documento (R40 com balde) e renderer (lê e grava os pixels).
- [x] Editor: atalho, botão e clique como um passo do histórico.
