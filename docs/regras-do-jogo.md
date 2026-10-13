# Regras do jogo — fonte de verdade técnica

Este documento transforma a [especificação de produto](./especificacao-produto.md) em regras precisas e verificáveis. Onde a especificação é aberta ou ambígua, a decisão tomada está registrada aqui.

- Cada regra tem um identificador `Rnn`. Testes que cobrem uma regra citam o ID no nome: `it('R31: nenhum jogador recebe a mesma história em rodadas consecutivas', ...)`.
- Toda alteração de regra é feita **neste arquivo, no mesmo PR** que altera o código.
- Valores numéricos vivem em `packages/shared/src/constants.ts` com os nomes abaixo. O código nunca usa números mágicos para essas regras.

---

## 1. Constantes

| Nome | Valor | Uso |
|---|---|---|
| `MIN_PLAYERS` | 2 | Participantes conectados para iniciar |
| `MAX_PLAYERS` | 12 | Membros por sala (participantes + espectadores) |
| `FIXED_PANEL_COUNT_MIN` / `_MAX` | 2 / 12 | Faixa da quantidade fixa de quadros |
| `FIXED_PANEL_COUNT_DEFAULT` | 4 | Valor inicial quando o anfitrião escolhe "fixa" |
| `DRAWING_SECONDS_OPTIONS` | 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 540, 600 | Tempo por quadrinho (até 10 min) |
| `DRAWING_SECONDS_DEFAULT` | 90 | |
| `INDIVIDUAL_PANEL_COUNT_MIN` / `_MAX` | 2 / 6 | Faixa de quadros por história no modo individual (R62) |
| `INDIVIDUAL_PANEL_COUNT_DEFAULT` | 4 | |
| `STORY_SECONDS_OPTIONS` | 120, 180, 240, 300, 360, 480, 600 | Tempo para desenhar a história inteira no modo individual (R65) |
| `STORY_SECONDS_DEFAULT` | 300 | |
| `THEME_WRITING_SECONDS` | 90 | Duração da etapa de temas |
| `THEME_MIN_LENGTH` / `THEME_MAX_LENGTH` | 3 / 140 | Caracteres do tema (após normalização) |
| `NICKNAME_MAX_LENGTH` | 20 | |
| `TEXT_INPUT_MAX_LENGTH` | 1000 | Tamanho bruto máximo de qualquer campo de texto, antes da normalização (R1, R27); acima disso, `INVALID_PAYLOAD` |
| `READING_BASE_SECONDS` / `READING_PER_PANEL_SECONDS` / `READING_MAX_SECONDS` | 15 / 5 / 60 | Tempo máximo de leitura (R35) |
| `ROUND_CLOSING_MS` | 3000 | Janela para receber os quadros finais (R42) |
| `AUTOSAVE_INTERVAL_MS` | 5000 | Intervalo mínimo entre autosaves |
| `THEME_DRAFT_DEBOUNCE_MS` | 1000 | Debounce do rascunho de tema no cliente |
| `PANEL_WIDTH` / `PANEL_HEIGHT` | 1024 / 768 | Resolução lógica de todo quadrinho (4:3) |
| `PANEL_MAX_BYTES` | 2 097 152 (2 MiB) | Tamanho máximo do PNG |
| `ROOM_CODE_LENGTH` | 6 | |
| `ROOM_CODE_ALPHABET` | `23456789ABCDEFGHJKMNPQRSTUVWXYZ` | Sem 0/O, 1/I/L |
| `HOST_TRANSFER_GRACE_MS` | 30 000 | Anfitrião desconectado por esse tempo perde a função |
| `LOBBY_DISCONNECT_REMOVE_MS` | 120 000 | Membro desconectado no lobby é removido |
| `EMPTY_ROOM_TTL_MS` | 600 000 (10 min) | Sala sem ninguém conectado é encerrada |
| `ROOM_MAX_AGE_MS` | 43 200 000 (12 h) | Idade máxima de uma sala |
| `GUEST_SESSION_TTL_MS` | 86 400 000 (24 h) | Validade da sessão, renovada a cada uso |

Em testes, os tempos são injetados por `GameTimingConfig` (ver [arquitetura](./arquitetura.md#tempo)), nunca alterando as constantes.

---

## 2. Identidade do convidado

**R1 — Nickname.** Normalização: `trim`, espaços internos repetidos viram um, remoção de caracteres de controle. Quebras de linha e tabulações contam como espaço (viram um espaço, não somem). Comprimento de 1 a `NICKNAME_MAX_LENGTH` *code points* (`[...s].length`). Nicknames repetidos são permitidos; a identidade interna é o `playerId`.

**R2 — Avatar.** `AvatarConfig = { head, eyes, mouth, cheeks, hat, faceAccessory }`. `head`, `eyes` e `mouth` são obrigatórios; `cheeks`, `hat` e `faceAccessory` aceitam `null` (nenhum). Cada valor precisa existir no catálogo (`packages/shared/src/avatar/catalog.json`) para a categoria correta. O servidor rejeita IDs desconhecidos (`INVALID_PAYLOAD`). O cliente, ao carregar uma configuração salva com IDs que não existem mais, substitui apenas a categoria inválida pelo padrão.

**R3 — Sessão.** O servidor emite um token opaco (32 bytes aleatórios, base64url) e guarda apenas seu hash SHA-256, em memória. Validade de `GUEST_SESSION_TTL_MS`, renovada a cada uso. Token inválido ou expirado: o cliente cria uma nova sessão silenciosamente e mantém o perfil local.

**R4 — Perfil local.** Nickname e avatar ficam no `localStorage` (`comicle.profile`) e são enviados ao criar ou entrar em uma sala. O perfil só pode ser alterado fora de sala ou com a sala no lobby. Primeira visita: avatar aleatório e campo de nickname vazio.

**R5 — Uma conexão por sessão e sala.** Uma nova conexão da mesma sessão na mesma sala substitui a anterior; a antiga recebe `session:replaced` e é desconectada.

---

## 3. Salas

**R6 — Código.** `ROOM_CODE_LENGTH` caracteres de `ROOM_CODE_ALPHABET`, gerado com CSPRNG, único entre salas ativas. A entrada do usuário é normalizada para maiúsculas e sem espaços.

**R7 — Convite.** O link é `{origem}{BASE_PATH}/sala/{CODIGO}`. Abrir o link sem perfil leva à personalização e depois à sala.

**R8 — Anfitrião inicial.** Quem cria a sala é o anfitrião.

**R9 — Capacidade.** No máximo `MAX_PLAYERS` membros (participantes + espectadores). Sala cheia: `ROOM_FULL`. A reconexão de um membro existente nunca é bloqueada pela capacidade.

**R10 — Entrada durante a partida.** Quem entra com a partida em andamento vira **espectador**: vê uma tela de espera durante a criação e acompanha a apresentação. Na próxima partida, participa normalmente.

**R11 — Configurações.** Só o anfitrião altera, só no lobby. Toda alteração é refletida imediatamente para todos.

**R12 — Expulsão.** Só o anfitrião, só no lobby, nunca a si mesmo. A sessão expulsa fica banida daquela sala até ela ser encerrada (`KICKED` ao tentar voltar).

**R13 — Desconexão no lobby.** O membro aparece como desconectado e é removido após `LOBBY_DISCONNECT_REMOVE_MS` sem retorno.

**R14 — Transferência de anfitrião.** Quando o anfitrião sai (`room:leave`) ou fica desconectado por `HOST_TRANSFER_GRACE_MS`, a função passa ao membro **conectado** com `joinedAt` mais antigo, priorizando participantes da partida em andamento. Se ninguém estiver conectado, a função fica pendente e passa ao primeiro membro que se conectar; isso inclui o próprio anfitrião, que ainda não a tinha perdido. Se foi o anfitrião que saiu, o membro mais antigo a segura enquanto isso. Depois de transferida, o anfitrião anterior não recupera a função ao voltar ([D21](./decisoes.md)).

**R15 — Sair da sala.** No lobby, o membro é removido; se era o último membro, a sala é encerrada na hora (R16). Durante a partida, o participante mantém sua vaga (os quadros que lhe caberiam ficam vazios) e pode voltar pelo link com a mesma sessão.

**R16 — Encerramento da sala.** A sala é encerrada quando fica sem membros conectados por `EMPTY_ROOM_TTL_MS`, quando atinge `ROOM_MAX_AGE_MS` ou, imediatamente, quando fica sem nenhum membro (o último saiu ou foi removido pelo R13). Ao encerrar, todo o conteúdo é apagado da memória e do banco, e quem ainda estiver conectado recebe `room:removed { reason: 'closed' }`.

**R17 — Reinício do servidor.** Na v1, o estado vivo das salas existe só em memória: um reinício encerra todas as salas e, na inicialização, o servidor apaga do banco todo conteúdo de salas não encerradas (ver [decisões D3](./decisoes.md)).

---

## 4. Configurações da partida

**R18 — Formato.** `MatchSettings = { mode: 'collaborative' | 'individual', panelCount: { kind: 'per_player' } | { kind: 'fixed', value }, drawingSeconds, showPreviousPanels, authorDrawsLast, individual: { panelsPerStory, storySeconds } }`, com `value` entre `FIXED_PANEL_COUNT_MIN` e `_MAX`, `drawingSeconds` em `DRAWING_SECONDS_OPTIONS`, `showPreviousPanels` (R38) e `authorDrawsLast` (R31) booleanos, `panelsPerStory` inteiro entre `INDIVIDUAL_PANEL_COUNT_MIN` e `_MAX` e `storySeconds` em `STORY_SECONDS_OPTIONS`. Todos os campos são obrigatórios nos dois modos; cada modo lê só os seus (`panelCount`, `drawingSeconds`, `showPreviousPanels` e `authorDrawsLast` no colaborativo; `individual` no individual), e os demais ficam guardados para o anfitrião não perdê-los ao trocar de modo.

**R19 — Padrões.** `collaborative`, `per_player`, `DRAWING_SECONDS_DEFAULT`, `showPreviousPanels: false`, `authorDrawsLast: true` e `individual: { panelsPerStory: INDIVIDUAL_PANEL_COUNT_DEFAULT, storySeconds: STORY_SECONDS_DEFAULT }`.

**R20 — Quantidade baseada nos jogadores.** `totalRounds` = número de participantes no início da partida; com `authorDrawsLast: false`, um a menos (no mínimo 1: com 2 jogadores, cada história tem um quadro).

**R21 — Modo individual.** `mode: 'individual'` é aceito nas configurações; suas regras estão na [seção 12](#12-modo-individual). Com ele escolhido, o lobby mostra só a quantidade de quadros por história e o tempo da história, e esconde as opções do colaborativo. O servidor já inicia partidas individuais; *até a T37*, a interface mostra o modo como "Em breve", desabilitado.

---

## 5. Início da partida

**R22 — Pré-condições.** Anfitrião, sala no lobby e pelo menos `MIN_PLAYERS` membros conectados. Caso contrário: `NOT_HOST`, `INVALID_STATE` ou `NOT_ENOUGH_PLAYERS`.

**R23 — Participantes e assentos.** Participantes são os membros conectados no instante do início. A ordem dos assentos é embaralhada com CSPRNG (gerador injetável em testes). O assento define o autor de cada história (história `s_i` pertence ao assento `p_i`) e a rotação (R30).

**R24 — Desconectados no início.** Membros desconectados no instante do início viram espectadores daquela partida.

**R25 — Conteúdo anterior.** Ao iniciar uma partida, o conteúdo da partida anterior da mesma sala é apagado.

---

## 6. Etapa de temas

**R26 — Fase.** `theme_writing`, com prazo de `THEME_WRITING_SECONDS`.

**R27 — Texto.** Normalização igual ao R1; comprimento entre `THEME_MIN_LENGTH` e `THEME_MAX_LENGTH`.

**R28 — Rascunho e envio.** O cliente envia `theme:draft` com debounce de `THEME_DRAFT_DEBOUNCE_MS`. `theme:submit` torna o tema final; depois disso não há edição.

**R29 — Encerramento antecipado.** A fase termina antes do prazo quando **todos** os participantes enviaram o tema final.

**R30 — Prazo esgotado.** Para cada participante, vale o tema final; senão, o último rascunho válido; senão, um tema reserva sorteado sem repetição dentro da partida (lista em `apps/server/src/modules/stories/fallback-themes.ts`, em pt-BR, com ao menos 40 itens). O campo `source` registra `player` ou `fallback`.

---

## 7. Distribuição das histórias

**R31 — Fórmula.** Com assentos `p_0 … p_{N-1}` e história `s_i` do assento `p_i`, na rodada `r` (base 0) a história `s_i` vai para o jogador `p_{(i + 1 + (r mod C)) mod N}`, com `C = N` quando `authorDrawsLast` está ligada (o padrão) e `C = N − 1` quando está desligada: aí a rotação pula o autor, que nunca desenha a própria história, com qualquer quantidade de quadros.

Exemplo com 5 jogadores (Ana=0, Bruno=1, Carla=2, Diego=3, Elisa=4) e 5 quadros:

| Rodada | História da Ana vai para | História do Bruno vai para |
|---|---|---|
| 0 | Bruno | Carla |
| 1 | Carla | Diego |
| 2 | Diego | Elisa |
| 3 | Elisa | Ana |
| 4 | Ana (autora desenha o último quadro) | Bruno |

Com `authorDrawsLast` desligada e "baseada nos jogadores", são 4 quadros: a rodada 4 não existe, e a Ana nunca desenha a própria história.

**R32 — Propriedades garantidas** (testadas para todo `N` de 2 a 12 e todo total de rodadas de 2 a 12, com `authorDrawsLast` ligada):
1. Em cada rodada, a atribuição é uma bijeção: cada jogador recebe exatamente uma história e cada história, exatamente um jogador.
2. Nenhum jogador recebe a mesma história em rodadas consecutivas.
3. Com `totalRounds ≤ N − 1`, o autor nunca desenha a própria história.
4. Com `totalRounds ≤ N`, todos os quadros de uma história têm artistas diferentes.
5. Com `totalRounds = N`, cada jogador contribui exatamente uma vez para cada história.

Com `authorDrawsLast` desligada (testadas para todo `N` de 2 a 12 e todo total de 1 a 12): vale 1; o autor nunca desenha a própria história; com `N ≥ 3`, vale 2; com `totalRounds = N − 1`, cada outro jogador contribui exatamente uma vez para cada história. Com 2 jogadores e mais de um quadro, o outro jogador desenha todos os quadros da história, inclusive em rodadas seguidas.

**R33 — Plano.** A distribuição é uma função pura, calculada no início da partida para todas as rodadas e guardada como plano imutável.

---

## 8. Rodadas

**R34 — Primeira rodada.** A rodada 0 não tem leitura: começa direto em `round_drawing`. O jogador vê o tema e a tela de desenho.

**R35 — Leitura.** A partir da rodada 1, cada rodada começa em `round_reading`, com prazo `min(READING_BASE_SECONDS + READING_PER_PANEL_SECONDS × r, READING_MAX_SECONDS)` segundos, sendo `r` o índice da rodada (= quadros já existentes).

**R36 — Conteúdo da leitura.** O jogador vê o tema e todos os quadros anteriores da história recebida, na composição de HQ. O botão **Começar a desenhar** envia `round:ready` e leva o jogador direto ao desenho (R38), mesmo com os demais ainda lendo. A partir daí, até a apresentação, o servidor nunca mais envia nem autoriza a esse jogador os quadros daquela história, exceto como referência do desenho quando `showPreviousPanels` está ligada (R38). A confirmação vale para a rodada: se a mesma história voltar a ele numa rodada posterior (quantidade fixa maior que o número de participantes), ele a lê de novo.

**R37 — Fim da leitura.** A leitura termina quando todos os participantes **conectados** confirmaram ou quando o prazo acaba; quem não confirmou é marcado como pronto automaticamente. Participantes desconectados contam como prontos.

**R38 — Desenho.** Cada jogador começa a desenhar ao confirmar a leitura (ou quando ela termina); na rodada 0, todos começam juntos. O prazo do desenho é **comum**: fim da leitura + `drawingSeconds`, e a fase `round_drawing` vai do fim da leitura até ele. Enquanto a leitura não termina, a tarefa de quem já desenha traz o prazo mais tarde possível (prazo da leitura + `drawingSeconds`), que fica mais cedo se a leitura terminar antes. O tema fica visível como referência textual; os quadros anteriores, não — salvo com `showPreviousPanels` ligada: aí a tarefa de desenho traz os quadros anteriores da história, que o jogador vê em miniatura (um clique amplia um deles), da confirmação da leitura até entregar o quadro (envio final, R40); depois disso, mais nada.

**R39 — Autosave.** Enquanto desenha (inclusive durante a leitura dos demais, R38), o cliente envia `panel:autosave` com o PNG atual no máximo a cada `AUTOSAVE_INTERVAL_MS`, e só se houve mudança. O servidor guarda, em memória, o último por (rodada, jogador).

**R40 — Concluir.** `panel:submit { reason: 'done' }` envia o PNG final. O jogador vai para a espera e não pode reabrir o quadro. Tela sem nenhum traço é enviada sem imagem. Qualquer envio final (`done` ou `timeout`) encerra a participação do jogador na rodada.

**R41 — Encerramento antecipado.** O desenho termina antes do prazo quando **todos** os participantes (inclusive desconectados) concluíram.

**R42 — Fechamento.** Ao fim do desenho, a partida entra em `round_closing` por `ROUND_CLOSING_MS` e o servidor emite `round:collect`. Os clientes que ainda não concluíram enviam `panel:submit { reason: 'timeout' }` com o que houver na tela. Ao final da janela, cada quadro é resolvido nesta ordem: envio final → último autosave → vazio; um envio final sem imagem (tela em branco) é vazio, mesmo com autosave anterior. A janela termina antes se todos os envios finais já chegaram; se o desenho acabou porque todos concluíram (R41), a rodada é resolvida na hora, sem janela. Os quadros da rodada são persistidos em uma única transação.

**R43 — Status do quadro.** `complete` (o jogador concluiu), `partial` (imagem vinda de `timeout` ou autosave) ou `empty` (nenhuma imagem). Quadros `partial` são exibidos normalmente, sem marcação.

**R44 — Envios inválidos.** Envio na leitura antes de confirmá-la, para outra rodada, fora da fase ou depois da janela de fechamento: `INVALID_STATE` ou `DEADLINE_PASSED`. Envio repetido depois de `done`: `INVALID_STATE`.

**R45 — Transição.** Depois do fechamento: se há próxima rodada, ela começa (leitura); senão, a partida vai para `presentation`.

---

## 9. Desconexões durante a partida

**R46 — Vaga preservada.** O participante desconectado mantém a vaga; nenhuma fase espera por ele além do prazo.

**R47 — Volta na leitura.** Se ainda não confirmou, volta a ver os quadros da rodada atual. Se já confirmou, volta ao desenho (R48), sem vê-los.

**R48 — Volta no desenho.** O cliente baixa o próprio rascunho (`GET /api/rooms/:code/my-draft`) e o usa como camada base do canvas; o histórico de desfazer recomeça vazio.

**R49 — Volta nos temas.** O rascunho do tema volta preenchido pela `PlayerView`.

---

## 10. Apresentação

**R50 — Ordem.** As histórias são apresentadas na ordem dos assentos.

**R51 — Cursor.** `{ storyIndex, step }`, com `step` = `theme` | `panel(k)` | `full`, e `status` = `showing` | `finished`. Estado inicial: história 0, `theme`.

**R52 — Navegação (só anfitrião).**

| Ação | Efeito |
|---|---|
| `next` | `theme` → `panel(0)`; `panel(k)` → `panel(k+1)`; último quadro → `full`; `full` → `theme` da próxima história; `full` da última → `finished` |
| `prev` | `panel(0)` → `theme`; `panel(k)` → `panel(k−1)`; `full` → último quadro; `theme` → `full` da história anterior (se houver); `finished` → `full` da última |
| `showFull` | vai para `full` da história atual |
| `nextStory` | vai para `theme` da próxima história; a atual passa a contar como totalmente revelada; na última, vai para `finished` |
| `goToStory(i)` | só para `i ≤ maxStoryReached` (senão `INVALID_STATE`); vai para `full` da história `i`, também a partir de `finished` |

Ações sem efeito definido na tabela — `prev` no `theme` da primeira história; `next`, `showFull` e `nextStory` em `finished` — não mudam o cursor e respondem `ok` (D29). Navegar ou encerrar fora da apresentação → `INVALID_STATE`; de quem não é anfitrião → `NOT_HOST`.

**R53 — Revelação.** Cada história tem `revealedCount`, que só cresce: `panel(k)` revela até `k+1`; `full`, `nextStory` ou sair da história para frente revela tudo. `maxStoryReached` também só cresce.

**R54 — Acesso às imagens.** Na apresentação, um quadro é acessível se sua história tem índice `< maxStoryReached`, ou se está na história `maxStoryReached` com posição `< revealedCount`.

**R55 — Créditos.** O tema mostra o autor; cada quadro mostra o artista. Quadro `empty` aparece como um quadro em branco com o texto "{nickname} não desenhou a tempo".

**R56 — Encerrar.** `presentation:end` (anfitrião, em qualquer ponto da apresentação) devolve a sala ao lobby e marca a partida como `finished` no banco. Espectadores viram membros comuns. O conteúdo permanece até a próxima partida começar (R25) ou a sala ser encerrada (R16).

**R57 — Abortar partida.** `match:abort` (anfitrião, com confirmação na interface) devolve a sala ao lobby em qualquer fase e apaga o conteúdo da partida. O servidor também aborta quando não consegue gravar os temas ou uma rodada depois de uma nova tentativa. Nos dois casos, todos os conectados recebem `match:aborted` com o motivo (`host` ou `persistence_failed`).

---

## 11. Privacidade e autoridade

**R58 — Projeção mínima.** A `PlayerView` de um jogador nunca contém temas, quadros ou IDs de quadros que ele não pode ver naquele momento. Há testes de projeção para cada fase.

**R59 — Imagens autorizadas.** Imagens de quadros só saem pelo endpoint autorizado, que consulta a `PanelAccessPolicy` (função pura) e responde com `Cache-Control: private, no-store`. Fora da leitura própria (R36), do próprio desenho com `showPreviousPanels` (R38) e da apresentação (R54), nenhum quadro é acessível.

**R60 — Servidor autoritativo.** Fases, prazos, distribuição, revelação e função de anfitrião são decididos só pelo servidor. O cliente apenas exibe a `PlayerView` e envia intenções.

**R61 — Tempo.** Prazos são enviados como instantes absolutos do servidor (`phaseDeadlineAt`, em ms). O cliente corrige pelo deslocamento medido em `time:sync`. O servidor rejeita ações após o prazo, exceto os envios aceitos durante `round_closing` (R42).

---

## 12. Modo individual

Modo Quadrinhos Individuais ([especificação §9](./especificacao-produto.md), [D48](./decisoes.md)): cada jogador desenha sozinho uma história inteira de cada tema que não é o seu. Salas, início, temas (R22–R30), desconexões (R46) e privacidade (R58–R61) seguem as seções anteriores; esta seção diz o que muda. O protocolo dos envios é fechado na T36 e o da apresentação, na T38.

**R62 — Rodadas.** `totalRounds = N − 1` (no mínimo 1), sendo `N` o número de participantes: o autor **nunca** desenha o próprio tema. Cada história tem `individual.panelsPerStory` quadros. As configurações do colaborativo (quantidade de quadros, tempo por quadrinho, R31 `authorDrawsLast`, R38 `showPreviousPanels`) são ignoradas.

**R63 — Distribuição.** A fórmula do R31 com `C = N − 1`, trocando "história" por "tema": na rodada `r`, o tema do assento `p_i` vai para `p_{(i + 1 + r) mod N}`. Propriedades garantidas (testadas para todo `N` de 2 a 12): em cada rodada, cada jogador recebe exatamente um tema e cada tema, exatamente um jogador; o autor nunca recebe o próprio tema; ao fim, cada jogador desenhou exatamente uma versão de cada tema dos outros. Com 2 jogadores há uma rodada só, e cada um desenha o tema do outro. No plano de distribuição, o índice é a **versão** (R64) que o jogador desenha na rodada: a do tema `t` na rodada `r` é a história `t × (N − 1) + r`.

**R64 — Versões.** Cada par (tema, artista) é uma **versão**: uma história própria, com todos os quadros do mesmo artista, independente das demais (§9.3). São `N × (N − 1)` versões por partida, gravadas como linhas de `stories` que compartilham o `theme_id` ([modelo de dados](./modelo-de-dados.md#stories)). A ordem (`position`) é por assento do autor do tema e, dentro do tema, pela rodada em que a versão foi desenhada.

**R65 — Rodada.** Nenhuma rodada tem leitura: cada uma começa direto em `round_drawing`, com prazo comum de início + `individual.storySeconds`, que vale para a história inteira, não para cada quadro (§9.4). O jogador vê o tema e o editor com todos os quadros da sua versão: navega entre eles numa faixa de miniaturas numeradas ou com anterior/próximo e pode voltar a qualquer quadro até entregar. Ele nunca vê quadros de outros jogadores.

**R66 — Entrega e fechamento.** Os eventos `panel:autosave` e `panel:submit` levam `panelIndex`, de 0 a `panelsPerStory − 1`. O autosave (R39) guarda cada quadro da versão em andamento; o intervalo do R39 vale por jogador, não por quadro, então o cliente reveza os quadros que mudaram. Entregar (`done`) envia todos os quadros da história, um `panel:submit` por quadro; cada quadro aceita um envio final, e a participação do jogador na rodada termina quando todos chegaram. Não há como reabrir. A rodada termina antes do prazo quando todos os participantes (inclusive desconectados) entregaram (como no R41) e, senão, fecha como no R42: cada quadro é resolvido em envio final → último autosave → vazio, com os status do R43. Os quadros de todas as versões da rodada são persistidos numa única transação. Na volta durante o desenho (R48), a tarefa traz `draftPanels`, e o jogador baixa o rascunho de cada um (`my-draft?panelIndex=k`).

**R67 — Privacidade.** Até a apresentação, um jogador só tem acesso aos quadros da versão que desenha na rodada atual, e só enquanto não a entregou. O `my-draft` deixa de servir um quadro assim que ele é entregue, e `showPreviousPanels` (R38) não vale neste modo. Depois da entrega, nem a própria versão volta a ser vista antes da apresentação.

**R68 — Apresentação por tema.** Os temas são apresentados na ordem dos assentos dos autores e, para cada tema, todas as suas versões em seguida, na ordem do R64. O tema mostra o autor; cada versão mostra o artista, revela os quadros um a um e depois a página completa (como R51–R53); a última versão de um tema leva ao tema seguinte. Créditos e quadros vazios seguem o R55; baixar a HQ (D40), também, por versão.
