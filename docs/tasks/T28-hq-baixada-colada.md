# T28 — HQ baixada com quadros colados

**Depende de:** T25 · **Pacotes:** web · **Branch:** `task/28-hq-baixada-colada`

## Objetivo
Pedido do criador do projeto: no PNG de **Baixar HQ**, os quadros ficam grudados como numa revista em quadrinhos, com o tema da história no alto da página.

## Leia antes
- `docs/interface.md` §3 e §5
- `docs/decisoes.md` D40
- `apps/web/src/features/comic/comic-export.ts`

## Entregáveis
- [x] Novo layout do export: tema (título) no topo, quadros lado a lado e linha a linha sem espaço entre eles, com uma única linha de nanquim separando-os e moldura externa.
- [x] Créditos (autor e artistas) saem de baixo de cada quadro e vão para um rodapé compacto ("Tema de X · Quadros 1 Ana, 2 Bruno…"), para não abrir espaço entre os quadros.
- [x] Última linha incompleta: quadros centralizados, ainda colados entre si.
- [x] `interface.md` §5 atualizado e decisão D44.

## Fora do escopo
- Mudar a `ComicPage` da tela (continua com calhas).

## Critérios de aceite
- [x] O PNG baixado mostra o tema no topo e os quadros colados, inclusive os vazios (retícula).

## Testes obrigatórios
- [x] Unitários do layout: posições sem calha, centralização da última linha, altura do título com quebra.
- [x] O E2E da T25 continua verde.
