# T26 — Pincel ajustável

**Depende de:** T13 · **Pacotes:** web · **Branch:** `task/26-pincel-ajustavel`

## Objetivo
Pedido do criador do projeto: a espessura passa a ser escolhida numa barra horizontal (quanto mais à direita, maior), o cursor sobre o canvas vira uma bolinha do tamanho do traço e o pincel ganha opacidade ajustável.

## Leia antes
- `docs/interface.md` §4
- `docs/decisoes.md` D25, D39

## Entregáveis
- [ ] Faixa contínua de espessura (`BRUSH_SIZE_MIN`…`BRUSH_SIZE_MAX` px lógicos) no lugar dos 4 tamanhos fixos; `[` e `]` continuam diminuindo e aumentando.
- [ ] Barra horizontal (`input type="range"`) de espessura na barra de ferramentas, com prévia do traço.
- [ ] Cursor do canvas: círculo do diâmetro do traço na escala da tela, no lugar da mira; some fora do canvas e com o balde.
- [ ] Opacidade do pincel (barra de 10 % a 100 %), guardada na operação `stroke`; o traço inteiro é composto de uma vez (sem escurecer onde ele se cruza). Borracha e balde continuam opacos.
- [ ] `interface.md` §4 e decisão D41.

## Fora do escopo
- Pressão da caneta, opacidade da borracha e do balde, pincéis com textura.

## Critérios de aceite
- [ ] Num navegador real, arrastar a barra muda a espessura e a bolinha do cursor acompanha o tamanho do traço.
- [ ] Um traço a 50 % que cruza a si mesmo tem opacidade uniforme; export e autosave levam a opacidade.
- [ ] Desfazer e refazer preservam espessura e opacidade de cada traço.

## Testes obrigatórios
- [ ] Unitários: limites da espessura e dos atalhos, cálculo do raio do cursor na escala da tela.
- [ ] Renderer: traço com opacidade é composto numa camada e desenhado com `globalAlpha`.
- [ ] Editor: barras de espessura e opacidade acessíveis por papel e nome, atalhos `[`/`]`.
