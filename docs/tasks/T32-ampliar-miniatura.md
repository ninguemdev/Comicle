# T32 — Ampliar a miniatura ao desenhar

**Depende de:** T31 · **Pacotes:** web · **Branch:** `task/32-ampliar-miniatura`

## Objetivo
Pedido do criador do projeto: as miniaturas dos quadros anteriores (T31) ficaram pequenas demais; um clique deve abrir o quadro grande.

## Leia antes
- `docs/interface.md` §2 e §4
- `docs/decisoes.md` D43

## Entregáveis
- [x] Cada miniatura vira um botão "Ampliar o quadro N de X" que abre o quadro num diálogo largo.
- [x] `Dialog` com a variante `wide`; o quadro em 4:3, até 70 % da altura da tela.
- [x] `Esc` fecha e devolve o foco; `Ctrl+Enter` não conclui com o diálogo aberto.
- [x] R38, `interface.md` §2, `especificacao-produto.md` e decisão D46.

## Critérios de aceite
- [x] No desktop e no celular, o quadro ampliado ocupa o diálogo sem sobra e sem distorcer.
- [x] Fechar volta ao editor com o desenho intacto.

## Testes obrigatórios
- [x] Tela de desenho: clicar abre o diálogo com o quadro; `Esc` fecha.
- [x] E2E: com a opção ligada, a miniatura abre o quadro grande com a imagem e `Esc` fecha.
