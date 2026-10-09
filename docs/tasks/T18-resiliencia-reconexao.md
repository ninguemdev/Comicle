# T18 — Resiliência e reconexão

**Depende de:** T17 · **Pacotes:** web, server · **Branch:** `task/18-resiliencia-reconexao`

## Objetivo
O jogo sobrevive a recarregar a página, rede instável, abas duplicadas, anfitrião sumindo e reinício do servidor, em todas as fases.

## Leia antes
- `docs/regras-do-jogo.md` R5, R13–R17, R46–R49
- `docs/protocolo-realtime.md` §2, §4, §6

## Entregáveis
- [x] Cliente: ao reconectar o socket, reentra automaticamente na sala da rota (`room:join` com o mesmo código) e restaura a tela pela view.
- [x] Cliente: `ConnectionBanner` ("Reconectando…") sem trocar de tela; ações desabilitadas enquanto desconectado; envio pendente de `panel:submit` é refeito ao reconectar se a fase ainda permitir.
- [x] Cliente: sessão inválida após reinício do servidor → cria sessão nova e mostra "Esta sala foi encerrada" com volta ao início.
- [x] Servidor: revisão de todos os timers e caminhos de desconexão em cada fase (temas, leitura, desenho, fechamento, apresentação), incluindo transferência de anfitrião durante a partida e durante a apresentação.
- [x] Documento curto `docs/cenarios-de-reconexao.md` com a matriz fase × situação × comportamento esperado.

## Critérios de aceite
- [x] Recarregar a página em qualquer fase volta exatamente ao mesmo ponto, sem perder conteúdo além do previsto em R48.
- [x] Anfitrião fechando o navegador na apresentação: após `HOST_TRANSFER_GRACE_MS`, outro membro passa a conduzir.

## Testes obrigatórios (integração)
- [x] R47: desconecta antes de confirmar a leitura → volta e vê os quadros; desconecta depois → volta sem eles.
- [x] R48: desconecta no desenho após autosave → `hasDraft: true` e `my-draft` devolve a imagem.
- [x] R49: rascunho do tema volta após reconectar.
- [x] R46: participante desconectado durante toda a partida → quadros `empty`, partida chega ao fim.
- [x] R14 na apresentação: anfitrião desconectado → novo anfitrião consegue navegar.
- [x] R5 em partida: segunda aba assume e a primeira recebe `session:replaced`.
- [x] R16: todos desconectados por `EMPTY_ROOM_TTL_MS` no meio da partida → sala encerrada e conteúdo apagado.
