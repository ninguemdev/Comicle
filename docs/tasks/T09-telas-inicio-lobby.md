# T09 — Telas de início e lobby

**Depende de:** T07, T08 · **Pacotes:** web · **Branch:** `task/09-telas-inicio-lobby`

## Objetivo
O jogador consegue criar uma sala, convidar amigos pelo link, entrar por código e ver o lobby ao vivo, com o anfitrião configurando a partida.

## Leia antes
- `docs/interface.md` §2 (Início, Personalização, Lobby)
- `docs/regras-do-jogo.md` R4, R7, R9–R15, R18–R22
- `docs/protocolo-realtime.md` §3, §5

## Entregáveis
- [ ] Tela inicial: avatar + nickname atuais com atalho para editar; **Criar sala**; **Entrar em sala** com campo de código (normalização do R6 enquanto digita).
- [ ] Fluxo do convite: `/sala/:code` sem perfil → personalização → entra na sala.
- [ ] Rota da sala: entra (`room:join`) ao montar; trata `ROOM_NOT_FOUND`, `ROOM_FULL`, `KICKED`, `room:removed` e `session:replaced` com telas amigáveis e caminho de volta ao início.
- [ ] Lobby: código + **Copiar convite** (Clipboard API com fallback), grade de `PlayerChip` (coroa no anfitrião, estado desconectado), **Sair da sala**, **Editar perfil** (R4).
- [ ] Painel de configurações: quantidade de quadros (baseada nos jogadores / fixa com seletor 2–12), tempo por quadrinho (opções do R18), modo (Colaborativo; Individual "Em breve" desabilitado). Anfitrião edita; demais veem em modo leitura, atualizado ao vivo.
- [ ] **Iniciar partida** só para o anfitrião, desabilitado com motivo enquanto houver menos de `MIN_PLAYERS` conectados (o envio de `match:start` em si chega na T11; aqui o botão pode chamar a ação e exibir o erro retornado).
- [ ] Ação de expulsar no `PlayerChip` (anfitrião), com confirmação.
- [ ] Se a sala estiver em partida ao entrar, mostra a tela de espectador simples (a completa vem na T15).

## Fora do escopo
- Telas da partida (T15).

## Critérios de aceite
- [ ] Dois navegadores: criar no primeiro, colar o link no segundo, ambos se veem no lobby em tempo real.
- [ ] Alterar configuração no anfitrião reflete no outro sem recarregar.
- [ ] Funciona em 360px de largura.

## Testes obrigatórios (componentes, store mockada)
- [ ] Anfitrião vê controles de configuração, expulsar e iniciar; não anfitrião vê só leitura.
- [ ] Botão iniciar desabilitado mostra o motivo correto.
- [ ] Copiar convite gera `{origem}{BASE_PATH}/sala/{CODIGO}` (R7).
- [ ] Cada erro de entrada mostra sua tela.
- [ ] Campo de código normaliza para maiúsculas e ignora caracteres inválidos.
