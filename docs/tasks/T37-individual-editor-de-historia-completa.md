# T37 — Modo individual: editor de história completa

**Depende de:** T36 · **Pacotes:** web · **Branch:** `task/37-individual-editor-de-historia-completa` · **Versão:** 1.1

## Objetivo
No cliente, o lobby com o modo individual e o ambiente de criação com todos os quadros da história (`especificacao-produto.md` §9.2): navegar entre os quadros, cada um com o editor da T13, um timer para a história inteira e a entrega.

## Leia antes
- `docs/especificacao-produto.md` §9
- `docs/regras-do-jogo.md` §12 (R62–R68)
- `docs/decisoes.md` D48
- `docs/interface.md` (editor de desenho, lobby)

## Decisões (D48)
- Editor com o quadro atual grande, uma faixa de miniaturas numeradas de todos os quadros (clicáveis) e botões anterior/próximo.
- No lobby, o modo individual mostra só quadros por história (2–6) e tempo da história (2–10 min); as opções do colaborativo ficam ocultas.

## Entregáveis
- [x] Lobby: seletor de modo habilitado (sem "Em breve"), com as configurações de cada modo; demais jogadores veem em modo leitura.
- [x] Tela de desenho individual: tema, timer da história, editor do quadro atual, faixa de miniaturas numeradas com o desenho em andamento, anterior/próximo e "Enviar história" com confirmação.
- [x] Cada quadro mantém o próprio documento de traços e histórico; autosave por quadro (R39, R66).
- [x] Volta durante o desenho: os rascunhos de todos os quadros voltam como camada base (R48).
- [x] Textos em `strings/pt-BR.ts`; atualizar `interface.md`.

## Fora do escopo
- Apresentação (T38).

## Critérios de aceite
- [x] O anfitrião escolhe o modo individual e inicia; cada jogador desenha os quadros em qualquer ordem e entrega a história.
- [x] Ao fim do tempo, o que estiver em cada quadro é entregue.
- [x] Teclado e leitor de tela navegam entre os quadros.

## Testes obrigatórios
- [x] R21: lobby mostra as configurações de cada modo.
- [x] R65: navegação entre quadros preserva os desenhos.
- [x] R66: entrega e envio por tempo esgotado de todos os quadros.
- [x] E2E de uma partida individual com 2 jogadores.

## Notas
Task grande: usar o modo de planejamento e apresentar o plano antes de editar. A T36 deixou o contrato pronto (D49): `panel:autosave` e `panel:submit` com `panelIndex` (a `room-store` hoje manda sempre 0), a tarefa `draw_panel` com `panelCount` e `draftPanels`, e `my-draft?panelIndex=k`. O servidor aceita um autosave a cada 2 s por conexão, então o cliente reveza os quadros que mudaram.
