# T25 — Baixar a HQ na apresentação

**Depende de:** T17 · **Pacotes:** web · **Branch:** `task/25-baixar-hq`

## Objetivo
Na apresentação, um botão para baixar a história em quadrinhos completa como imagem.

## Leia antes
- `docs/interface.md` §3, §5
- `docs/regras-do-jogo.md` R54, R55, R59

## Entregáveis
- [x] `features/comic/comic-export.ts`: layout puro da página exportada, quebra do tema, nome do arquivo e a montagem do PNG num canvas.
- [x] `DownloadComicButton` na vista `full` da apresentação, para todos; `saveFile` em `lib/`.
- [x] `usePanelImageLoader` separado do `usePanelImage`.
- [x] Botão também em `/dev/comic`.
- [x] `interface.md` §5, `especificacao-produto.md`, D40, escopo no `AGENTS.md`.

## Critérios de aceite
- [x] Anfitrião e demais baixam um PNG com tema, autor, quadros numerados e artistas, inclusive os vazios.
- [x] Sem mudança no servidor nem no protocolo; só quadros que o jogador já pode ver (R54).

## Testes obrigatórios
- [x] Unitários do layout, da quebra do tema e do nome do arquivo.
- [x] Tela da apresentação: botão na vista `full`, para anfitrião e demais, aviso de falha.
- [x] E2E: a partida completa baixa a primeira história e confere a assinatura PNG.
