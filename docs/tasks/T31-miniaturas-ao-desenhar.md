# T31 — Quadros anteriores em miniatura ao desenhar

**Depende de:** T30 · **Pacotes:** shared, server, web · **Branch:** `task/31-miniaturas-ao-desenhar`

## Objetivo
Pedido do criador do projeto: uma opção da partida que mostra, à direita do editor, miniaturas de todos os quadros anteriores da história, só para conferir o desenho anterior enquanto desenha o próximo.

## Leia antes
- `docs/especificacao-produto.md` (memorização)
- `docs/regras-do-jogo.md` R18, R36, R38, R54, R58, R59
- `docs/protocolo-realtime.md` (`MatchSettings`, `PlayerView`, endpoint de imagens)
- `docs/interface.md` §2 e §4

## Decisões do criador
- É uma **configuração da partida** (`showPreviousPanels`), desligada por padrão: desligada, o jogo de memória continua como hoje.
- Ligada, aparecem **todos** os quadros anteriores da história recebida, pequenos, numa coluna à direita do canvas.

## Entregáveis
- [ ] `MatchSettings.showPreviousPanels: boolean` (tipo, schema, padrão, persistência).
- [ ] `PanelAccessPolicy` e `buildPlayerView`: com a opção ligada, o artista da rodada vê os quadros anteriores da história que está desenhando também no desenho (e no fechamento).
- [ ] Editor: coluna de miniaturas à direita no desktop; no mobile, faixa compacta que não tira espaço do canvas.
- [ ] Interruptor no lobby.
- [ ] `especificacao-produto.md` (com aprovação explícita do pedido), R18, R36, R38, R58, R59, protocolo, `interface.md`, decisão D-nova.

## Critérios de aceite
- [ ] Opção ligada: o artista vê as miniaturas do começo ao fim do desenho, inclusive depois de recarregar a página.
- [ ] Opção desligada: nenhuma imagem é autorizada depois do `round:ready` (R36 inalterada).

## Testes obrigatórios
- [ ] R59: política de acesso nas duas opções, para cada fase.
- [ ] R58: projeção do desenho nas duas opções.
- [ ] Editor: coluna de miniaturas aparece só com a opção ligada.
- [ ] E2E: partida com a opção ligada mostra as miniaturas na segunda rodada.

## Notas
Task grande: usar o modo de planejamento e apresentar o plano antes de editar.
