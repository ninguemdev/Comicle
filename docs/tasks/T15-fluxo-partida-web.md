# T15 — Fluxo da partida no cliente

**Depende de:** T09, T12, T13, T14 · **Pacotes:** web · **Branch:** `task/15-fluxo-partida-web`

## Objetivo
Todas as telas da criação (temas, leitura, preparação, desenho, espera, transição, espectador) dirigidas pela `PlayerView`, com timer sincronizado, autosave e envio no prazo.

## Leia antes
- `docs/interface.md` §2, §4 (Layout), §6
- `docs/regras-do-jogo.md` §6, §8, §9 (R26–R49), R57, R61
- `docs/protocolo-realtime.md` §3–§6

## Entregáveis
- [ ] `features/match/match-screen.tsx`: escolhe a tela por `phase` e `task.kind`; transições suaves (respeitando movimento reduzido).
- [ ] `ThemeScreen`: campo com contador, exemplos de inspiração, rascunho com debounce (R28), **Pronto**; espera com progresso após enviar.
- [ ] `ReadingScreen`: tema, `ComicPage` com `previousPanels`, aviso de que não será possível rever, **Começar a desenhar** (R36), timer da leitura.
- [ ] `PrepareScreen`: sem quadros; progresso dos demais.
- [ ] `DrawingScreen`: `DrawingEditor`, timer, "Quadro X de Y", tema recolhível; autosave a cada `AUTOSAVE_INTERVAL_MS` só se `revision` mudou (R39); **Concluir** (R40, confirmação se faltar mais da metade do tempo); envio `timeout` ao zerar o timer local e ao receber `round:collect` (R42); restauração do rascunho via `my-draft` quando `hasDraft` (R48).
- [ ] `WaitingScreen`, `TransitionScreen`, `SpectatorScreen`.
- [ ] Anfitrião: botão **Encerrar partida** discreto com confirmação (R57).
- [ ] Anúncios `aria-live` de mudança de fase.

## Fora do escopo
- Apresentação (T17).

## Critérios de aceite
- [ ] Partida real com 3 navegadores completa temas e todas as rodadas até chegar à fase de apresentação (pode exibir um placeholder nela).
- [ ] Depois de **Começar a desenhar**, não há nenhum caminho na interface que mostre os quadros anteriores.
- [ ] Recarregar a página no meio do desenho volta ao desenho com o rascunho restaurado.

## Testes obrigatórios (componentes, store/socket mockados)
- [ ] Tema: digitação gera um único `theme:draft` após o debounce; **Pronto** envia `theme:submit` e mostra espera.
- [ ] Leitura: **Começar a desenhar** envia `round:ready`; com `status: 'ready'` nenhum quadro é renderizado.
- [ ] Desenho: autosave não é enviado sem mudanças; é enviado após mudança e intervalo.
- [ ] Desenho: timer local zerado envia `panel:submit { reason: 'timeout' }` uma única vez; `round:collect` após isso não reenvia.
- [ ] Desenho: com `hasDraft`, o editor recebe `baseImageUrl`.
- [ ] `MatchScreen` seleciona a tela correta para cada combinação de `phase` e `task`.
