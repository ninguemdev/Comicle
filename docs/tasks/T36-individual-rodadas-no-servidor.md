# T36 — Modo individual: rodadas no servidor

**Depende de:** T35 · **Pacotes:** shared, server · **Branch:** `task/36-individual-rodadas-no-servidor` · **Versão:** 1.1

## Objetivo
Uma rodada por tema dos outros (R62, R63): cada jogador desenha sozinho todos os quadros de uma versão, com tempo total da história (R65); autosave por quadro, entrega da história inteira e persistência das versões (R64, R66).

## Leia antes
- `docs/especificacao-produto.md` §9
- `docs/regras-do-jogo.md` §8 (R34–R45) e §12 (R62–R68)
- `docs/decisoes.md` D48
- `docs/arquitetura.md` §4 (máquina de fases, modos de jogo)

## Decisões (D48)
- `N − 1` rodadas, o autor nunca desenha o próprio tema; 2 a 6 quadros por história; tempo total de 2 a 10 min.
- Apresentação por tema (T38); opções do colaborativo ignoradas.

## Entregáveis
- [ ] Registrar `individualMode` no `registry` (remove a recusa provisória do R21) e ajustar a `MatchService`/máquina de fases para rodadas sem leitura com prazo `storySeconds`.
- [ ] Versões: uma `StoryState` por (tema, rodada), `N × (N − 1)` no total, com ids sorteados no início e `position` na ordem do R64; `newMatchRecord` grava todas.
- [ ] Rodada com `panelsPerStory` quadros por jogador: autosave e envio final por quadro (`panelIndex` nos eventos `panel:*`, validado contra `panelsPerStory`) e entrega da história inteira; fechamento e resolução por quadro (R66, R42, R43).
- [ ] `PlayerView`: tarefa de desenho com o tema, a quantidade de quadros e quais têm rascunho; espera depois da entrega.
- [ ] `GET /api/rooms/:code/my-draft` por quadro (R48) e `PanelAccessPolicy`/`buildPlayerView` respeitando o R67.
- [ ] Atualizar `protocolo-realtime.md`, `modelo-de-dados.md` e `cenarios-de-reconexao.md`.

## Fora do escopo
- Interface do editor (T37) e apresentação (T38).

## Critérios de aceite
- [ ] Uma partida individual de 3 jogadores passa por 2 rodadas sem leitura e chega à apresentação com 6 versões persistidas.
- [ ] Cada jogador desenha uma versão de cada tema dos outros e nunca o próprio.
- [ ] Quem cai no meio da rodada recupera os rascunhos de todos os quadros da sua versão.

## Testes obrigatórios
- [ ] R62/R65: rodadas, prazo da história inteira e ausência de leitura (máquina de fases).
- [ ] R64: quantidade, ordem e tema das versões gravadas.
- [ ] R66: entrega antecipada, fechamento por quadro (envio final → autosave → vazio) e envios inválidos.
- [ ] R67: matriz de privacidade e de acesso às imagens com partidas individuais.
- [ ] Integração de uma partida individual completa.

## Notas
Task grande: usar o modo de planejamento e apresentar o plano antes de editar. O `DistributionPlan` do modo individual indexa **temas** (arquitetura §4): a versão é o par (tema, rodada).
