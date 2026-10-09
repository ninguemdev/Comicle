# T14 — Página de HQ

**Depende de:** T06 · **Pacotes:** web · **Branch:** `task/14-pagina-hq`

## Objetivo
Composição visual de uma história como página de quadrinhos — o elemento de identidade do jogo, usado na leitura e na apresentação.

## Leia antes
- `docs/interface.md` §3
- `docs/especificacao-produto.md` §7
- `docs/regras-do-jogo.md` R55
- `docs/protocolo-realtime.md` §1 (imagens via `fetch` + `blob:`)

## Entregáveis
- [x] `features/comic/compute-comic-layout.ts` (puro).
- [x] `features/comic/use-panel-image.ts`: busca autenticada, `blob:` URL, revogação ao desmontar, estados de carregamento e erro.
- [x] `features/comic/panel-frame.tsx`: um quadro (imagem, número, quadro vazio com o texto do R55, crédito opcional).
- [x] `features/comic/comic-page.tsx`: `{ panels: PanelRef[], showCredits?, maxColumns? }`, tamanho que cabe na área visível, linhas incompletas centralizadas, rolagem quando necessário.
- [x] Página `/dev/comic` (só em dev) com histórias de 1 a 12 quadros usando imagens de exemplo.

## Critérios de aceite
- [x] Quadros nunca distorcidos; ordem de leitura previsível em todas as larguras.
- [x] Visual consistente com `interface.md` §1 (bordas de nanquim, calha, papel).

## Testes obrigatórios
- [x] `computeComicLayout`: todos os casos da tabela de `interface.md` §3 e propriedades (soma = n, linhas não crescentes, diferença máxima de 1 entre linhas).
- [x] `ComicPage` renderiza os quadros em ordem com `alt` "Quadro {n} de {artista}".
- [x] Quadro `empty` mostra o texto do R55.
- [x] `usePanelImage` revoga a URL ao desmontar e envia o header `Authorization`.
