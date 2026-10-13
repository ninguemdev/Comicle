# T30 — Desenhar logo depois de confirmar a leitura

**Depende de:** T12 · **Pacotes:** shared, server, web · **Branch:** `task/30-desenhar-ao-confirmar`

## Objetivo
Pedido do criador do projeto: quem clica em **Começar a desenhar** na leitura já vai direto para o editor, enquanto os demais ainda leem. Hoje todos esperam o último confirmar (ou o prazo da leitura).

## Leia antes
- `docs/regras-do-jogo.md` R34–R45, R47, R48, R58, R61
- `docs/protocolo-realtime.md` (`PlayerView`, `round:ready`, `panel:*`)
- `docs/cenarios-de-reconexao.md` (leitura e desenho)
- `docs/interface.md` §2

## Decisões do criador
- **Prazo comum:** o prazo de desenho continua igual para todos, `fim da leitura + drawingSeconds`. Quem confirma antes ganha esse tempo a mais.
- Enquanto a leitura não termina, o fim dela ainda não é conhecido: a `PlayerView` de quem já desenha mostra o prazo máximo (`prazo da leitura + drawingSeconds`) e ele é atualizado quando a leitura termina antes.

## Entregáveis
- [x] Máquina da rodada: depois do `round:ready`, a tarefa do jogador vira `draw_panel` ainda na fase `round_reading`; autosave e envio final aceitos nesse intervalo.
- [x] Prazo de desenho na `PlayerView` (campo próprio ou `phaseDeadlineAt` por tarefa) e cálculo no fim da leitura.
- [x] Envio `done` durante a leitura conta para o encerramento antecipado (R41); como só entrega quem confirmou, todos terem entregado implica que a leitura acabou (D42).
- [x] Reconexão no meio (R47/R48): quem já confirmou volta ao editor com o rascunho.
- [x] Cliente: a tela "Prepare-se…" deixa de existir; o editor abre ao confirmar e o cabeçalho mostra o timer de desenho.
- [x] R36–R39, R44, R47, protocolo, `cenarios-de-reconexao.md`, `interface.md` §2, `especificacao-produto.md`, decisão D42.

## Critérios de aceite
- [x] Com 3 jogadores, o primeiro a confirmar desenha enquanto os outros ainda leem; todos terminam no mesmo prazo.
- [x] Privacidade mantida: quem confirmou não recebe mais os quadros (R36), salvo a opção da T31.

## Testes obrigatórios
- [x] Domínio: prazo comum calculado no fim da leitura (todos confirmam antes / prazo da leitura acaba).
- [x] R39/R40 durante a leitura; entregas da leitura contam para o R41.
- [x] Integração com `socket.io-client`: um jogador desenha e envia durante a leitura dos demais.
- [x] E2E da partida completa continua verde.

## Notas
Task grande: usar o modo de planejamento e apresentar o plano antes de editar.
