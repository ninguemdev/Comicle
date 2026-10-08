# T16 — Apresentação no servidor

**Depende de:** T12 · **Pacotes:** server · **Branch:** `task/16-apresentacao-servidor`

## Objetivo
Cursor de apresentação controlado pelo anfitrião, revelação progressiva com autorização das imagens e encerramento da partida.

## Leia antes
- `docs/regras-do-jogo.md` §10 (R50–R56), R58, R59
- `docs/protocolo-realtime.md` §3 (`presentation:*`), §5 (`PresentationView`)
- `docs/modelo-de-dados.md` §1 (`PresentationCursor`)

## Entregáveis
- [ ] `modules/presentation/presentation-cursor.ts` (puro): estado inicial (R51), `navigate(cursor, action, storyPanelCounts)` (R52), regras de revelação (R53), `isPanelRevealed` (R54).
- [ ] Serviço e handlers de `presentation:navigate` e `presentation:end` (R56): status da partida no banco (`presenting` → `finished`), sala volta ao lobby, espectadores viram membros.
- [ ] `panel-access-policy` com a regra da apresentação (R54).
- [ ] Projeção `PresentationView` (`story`, `revealedPanels`, `reachedStories`) e task `watch` para todos.

## Critérios de aceite
- [ ] Todos os membros (incluindo espectadores) recebem a mesma etapa ao mesmo tempo.
- [ ] Nenhuma imagem não revelada é acessível, nem por ID adivinhado.

## Testes obrigatórios
- [ ] R52: cada linha da tabela de navegação, incluindo bordas (primeira/última história, `prev` em `finished`).
- [ ] R53: `revealedCount` e `maxStoryReached` nunca diminuem em uma sequência aleatória de 500 ações (teste de propriedade com `SeededRng`).
- [ ] R52: `goToStory` além de `maxStoryReached` → `INVALID_STATE`.
- [ ] R54: imagem do próximo quadro → 403; após `next` → 200; após `nextStory`, a história anterior inteira → 200.
- [ ] Não anfitrião navegando → `NOT_HOST`.
- [ ] R56: `presentation:end` → lobby, espectadores viram `member`, partida `finished`.
- [ ] R58: `revealedPanels` e `reachedStories` corretos em cada passo.
