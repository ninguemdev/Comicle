# T29 — Opção "autor desenha o último quadro"

**Depende de:** T27 · **Pacotes:** shared, server, web · **Branch:** `task/29-autor-desenha-ultimo`

## Objetivo
Pedido do criador do projeto: uma configuração da partida para ligar ou desligar a regra em que o autor do tema desenha o último quadro da própria história.

## Leia antes
- `docs/regras-do-jogo.md` R18–R20, R31–R33
- `docs/protocolo-realtime.md` (`MatchSettings`)
- `docs/modelo-de-dados.md` (onde as configurações são gravadas)

## Decisões do criador
- Desligada, a rotação **pula o autor**: na rodada `r`, `s_i` vai para `p_{(i + 1 + (r mod (N − 1))) mod N}`.
- Com quantidade "por jogador", desligada dá `N − 1` quadros (com 2 jogadores, 1 quadro).
- Na quantidade fixa, o autor nunca desenha; com 2 jogadores o mesmo jogador desenha quadros seguidos da história (R32.2 deixa de valer só nesse caso).
- Padrão: ligada (comportamento atual).

## Entregáveis
- [ ] `MatchSettings.authorDrawsLast: boolean` no tipo, no schema e nos padrões; persistência se as configurações forem gravadas.
- [ ] Distribuição pura com as duas fórmulas; `totalRounds` conforme a opção.
- [ ] Interruptor no lobby (anfitrião) e resumo para os demais.
- [ ] R18–R20, R31–R32, protocolo, decisão D-nova.

## Critérios de aceite
- [ ] Desligada, com 3 a 12 jogadores, nenhum autor desenha a própria história e cada história tem `N − 1` quadros no modo "por jogador".
- [ ] Ligada, nada muda em relação à v1.

## Testes obrigatórios
- [ ] R31/R32: propriedades da distribuição para todo `N` de 2 a 12 e todo total de 1 a 12, nas duas opções.
- [ ] R18: schema aceita o campo e aplica o padrão.
- [ ] Integração: partida com a opção desligada termina com `N − 1` quadros por história.
- [ ] Lobby: interruptor só para o anfitrião, refletido para todos.
