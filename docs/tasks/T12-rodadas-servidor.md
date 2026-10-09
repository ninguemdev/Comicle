# T12 — Rodadas no servidor

**Depende de:** T11 · **Pacotes:** server · **Branch:** `task/12-rodadas-servidor`

## Objetivo
Ciclo completo das rodadas: leitura com confirmação, desenho sincronizado, autosave, envio, fechamento, persistência dos quadros, transição e acesso autorizado às imagens.

## Leia antes
- `docs/regras-do-jogo.md` §8 (R34–R45), R58, R59
- `docs/protocolo-realtime.md` §1 (`/api/panels/:id`, `/my-draft`), §3 (`round:ready`, `panel:*`), §4 (`round:collect`), §5 (`read_story`, `draw_panel`, `wait`)
- `docs/modelo-de-dados.md` §1 (`RoundState`), §2 (`panels`)
- `docs/decisoes.md` D4, D7, D10, D14

## Entregáveis
- [x] Extensão da máquina de fases: `round_reading`, `round_drawing`, `round_closing` e transição para a próxima rodada ou `presentation` (a apresentação em si é a T16; aqui basta entrar na fase com o cursor inicial).
- [x] `round:ready` (R36, R37 com auto-confirmação no prazo e desconectados contando como prontos).
- [x] `panel:autosave` (R39, com rate limit de 1 a cada 2 s) e `panel:submit` (R40, R44).
- [x] Encerramento antecipado (R41), fechamento com `round:collect` e resolução de status (R42, R43).
- [x] `modules/drawing/panel-image.ts`: valida assinatura PNG, IHDR 1024×768 e tamanho.
- [x] Persistência da rodada em uma transação; falha → uma nova tentativa → abortar com aviso.
- [x] `modules/drawing/panel-access-policy.ts` (puro) com a regra da leitura (R36) e, por ora, negando tudo na apresentação (completada na T16).
- [x] Rotas `GET /api/panels/:panelId` (`no-store`) e `GET /api/rooms/:code/my-draft` (R48).
- [x] Projeção das tasks `read_story`, `draw_panel` (`hasDraft`), `wait`; `progress` por fase.

## Fora do escopo
- Navegação da apresentação (T16). Telas do cliente (T15).

## Critérios de aceite
- [x] Partida com 3 jogadores e 3 quadros roda do início à fase `presentation` em teste de integração com `timing` curto.
- [x] Ao fim de cada rodada, os rascunhos em memória daquela rodada são descartados.

## Testes obrigatórios
- [x] R34: rodada 0 começa direto no desenho.
- [x] R35: prazos de leitura para `r` = 1, 5 e 20.
- [x] R36: antes de `round:ready`, `previousPanels` existe e a imagem responde 200; depois, some da view e a imagem responde 403.
- [x] R37: prazo da leitura confirma quem faltou; desconectado não segura a fase.
- [x] R38: `phaseDeadlineAt` igual para todos.
- [x] R40/R44: envio repetido, rodada errada e fora da fase → erros corretos.
- [x] R41: todos concluíram → fechamento antecipado; um desconectado sem concluir → espera o prazo.
- [x] R42/R43: final > autosave > vazio, com status `complete`, `partial`, `empty`.
- [x] R45: depois da última rodada, fase `presentation`.
- [x] `panel-image`: assinatura errada, dimensões erradas e tamanho excedido → `IMAGE_INVALID` / `IMAGE_TOO_LARGE`.
- [x] R58: view de desenho nunca contém quadros; temas de histórias não atribuídas nunca aparecem.
- [x] `my-draft`: devolve só o rascunho do próprio jogador na rodada atual; 204 sem rascunho.
- [x] Falha simulada no repositório ao persistir → nova tentativa → partida abortada com aviso.

## Notas
- Fixture de PNG válido 1024×768: gere uma vez com um script e versione em `apps/server/test/fixtures/` (arquivo pequeno, cor sólida).
