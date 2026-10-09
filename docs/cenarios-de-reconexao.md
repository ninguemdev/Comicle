# Cenários de reconexão

O que acontece quando a conexão de alguém cai e volta, em cada fase. Complementa as regras R5, R13–R17 e R46–R49 ([regras do jogo](./regras-do-jogo.md)) e o §2 do [protocolo](./protocolo-realtime.md#2-conexão-socketio). Os cenários marcados com teste estão em `apps/server/test/integration/reconnection.test.ts` (servidor) e nos testes de componente do cliente.

## Como o cliente se comporta

- **Queda:** a faixa "Reconectando…" aparece no topo, sem trocar de tela (nas telas cheias, desenho e apresentação, elas começam abaixo da faixa). Botões que mandam ações ficam desabilitados; uma ação disparada sem conexão falha na hora, sem ir para o buffer do Socket.IO. O editor de desenho continua funcionando.
- **Volta:** ao reconectar, o cliente repete o `room:join` da sala da rota; o servidor reconhece a sessão (mesmo `playerId`, R9) e manda a `PlayerView`, que redesenha a tela no mesmo ponto.
- **Envio perdido:** um `panel:submit` que não chegou é refeito assim que o `room:join` é aceito, se a tela de desenho daquela rodada ainda estiver aberta (desenho, ou fechamento com o quadro a caminho). Autosave e rascunho do tema só contam como salvos depois do ack; os que falharam vão de novo no próximo intervalo ou quando a conexão volta.
- **Recarregar a página** é o mesmo que cair e voltar, mas sem nada em memória: o que não chegou ao servidor se perde (o traço desenhado depois do último autosave, R48).
- **Sessão recusada** (servidor reiniciado, R3, R17): o cliente cria uma sessão nova; o `room:join` encontra a sala inexistente e a tela vira "Sala encerrada", com volta ao início.

## Matriz

| Fase | Situação | Comportamento esperado | Teste |
|---|---|---|---|
| Lobby | Membro cai | Aparece desconectado; removido após `LOBBY_DISCONNECT_REMOVE_MS` se não voltar (R13) | `rooms.test.ts` |
| Lobby | Anfitrião cai | Mantém a função por `HOST_TRANSFER_GRACE_MS`; depois ela passa ao conectado mais antigo e não volta (R14) | `rooms.test.ts` |
| Qualquer | Segunda aba ou aparelho com a mesma sessão | A nova conexão assume; a antiga recebe `session:replaced` e mostra "Sala aberta em outro lugar"; a vaga continua conectada (R5) | `rooms.test.ts`, `reconnection.test.ts` (em partida) |
| Temas | Participante cai e volta (ou recarrega) | O rascunho volta no campo pela `PlayerView` (R49); o tema enviado continua enviado | `reconnection.test.ts` |
| Temas | Participante fica fora até o prazo | A etapa espera o prazo (R29); vale o último rascunho válido ou um tema reserva (R30) | `reconnection.test.ts` (R46) |
| Leitura | Cai antes de confirmar | Volta vendo os quadros da história (R47) | `reconnection.test.ts` |
| Leitura | Cai depois de confirmar | Volta em "Prepare-se…", sem os quadros; a imagem responde 403 (R36, R47) | `reconnection.test.ts` |
| Leitura | Fica fora | Não segura a fase: conta como pronto (R37) | `rounds.test.ts` |
| Desenho | Cai depois de um autosave e volta | `hasDraft: true`; o cliente baixa `my-draft` e usa como camada base, com o desfazer vazio (R48) | `reconnection.test.ts` |
| Desenho | O prazo local zera sem conexão | O envio por tempo é refeito ao voltar à sala, se o fechamento ainda aceitar; senão vale o último autosave (R42) | `drawing-screen.test.tsx` |
| Desenho | Fica fora | O desenho espera o prazo (R41); o quadro é o último autosave ou vazio (R42, R43) | `reconnection.test.ts` (R46) |
| Fechamento | Cai durante a janela | O quadro é resolvido com o que chegou: envio final, autosave ou vazio (R42) | `rounds.test.ts` |
| Partida inteira | Participante nunca volta | Mantém a vaga; todos os seus quadros ficam `empty` e a partida chega à apresentação (R46) | `reconnection.test.ts` |
| Partida | Anfitrião cai | Após `HOST_TRANSFER_GRACE_MS`, a função passa ao participante conectado mais antigo (R14) | `rooms.test.ts` |
| Apresentação | Anfitrião cai | Os demais continuam na mesma etapa; após `HOST_TRANSFER_GRACE_MS`, o novo anfitrião conduz (R14) | `reconnection.test.ts` |
| Apresentação | Membro cai e volta | Volta na etapa atual: a `PresentationView` é a mesma para todos (R58) | `presentation.test.ts` |
| Qualquer | Todos fora por `EMPTY_ROOM_TTL_MS` | A sala é encerrada e o conteúdo apagado; quem volta vê "Sala encerrada" (R16) | `reconnection.test.ts`, `room-store.test.ts` |
| Qualquer | Servidor reinicia | Todas as salas somem (R17); o cliente renova a sessão e mostra "Sala encerrada" | `room-store.test.ts` |
