# T17 — Apresentação no cliente

**Depende de:** T15, T16 · **Pacotes:** web · **Branch:** `task/17-apresentacao-web`

## Objetivo
A etapa social do jogo: revelação sincronizada das histórias, com o anfitrião conduzindo e a HQ completa em destaque. Ao fim desta task, o jogo é jogável de ponta a ponta.

## Leia antes
- `docs/interface.md` §5
- `docs/especificacao-produto.md` §8
- `docs/regras-do-jogo.md` §10

## Entregáveis
- [ ] `features/presentation/presentation-screen.tsx` com as vistas `theme`, `panel(k)`, `full` e `finished`.
- [ ] Faixa de miniaturas dos quadros já revelados na vista `panel(k)`.
- [ ] Controles do anfitrião (Voltar, Avançar, Ver HQ completa, Próxima história, menu Histórias, Encerrar) e atalhos `→`/`Espaço`, `←`, `F`.
- [ ] Indicador "História X de Y" e "O anfitrião está conduzindo" para os demais.
- [ ] Tela `finished` com **Nova partida** (anfitrião) → `presentation:end` → lobby.
- [ ] Animação de revelação leve (desligada com movimento reduzido).

## Critérios de aceite
- [ ] Com 3 navegadores, uma partida completa vai do lobby à apresentação e volta ao lobby para uma nova partida.
- [ ] Todos veem a mesma etapa; só o anfitrião vê controles.
- [ ] A vista `full` é a mais destacada e usa `ComicPage` com créditos.

## Testes obrigatórios (componentes)
- [ ] Cada vista renderiza o conteúdo certo a partir de uma `PresentationView` de exemplo.
- [ ] Controles só aparecem para o anfitrião; atalhos de teclado emitem as ações corretas.
- [ ] Menu Histórias lista só `reachedStories` e emite `goToStory`.
- [ ] Quadro vazio aparece com o texto do R55.
