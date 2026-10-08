# T07 — Avatares

**Depende de:** T06 · **Pacotes:** web, shared · **Branch:** `task/07-avatares`

## Objetivo
Sistema de avatares em camadas com artes provisórias, editor visual com prévia imediata, nickname e persistência local do perfil.

## Leia antes
- `docs/avatares.md` (todo)
- `docs/interface.md` §2 (Personalização)
- `docs/regras-do-jogo.md` R1, R2, R4

## Entregáveis
- [x] `catalog.json` completo, com 4 a 6 opções provisórias por categoria (mantendo os IDs criados na T02).
- [x] SVGs provisórios em `apps/web/public/avatars/<categoria>/` seguindo `avatares.md` §3, e o gabarito `_template.svg`.
- [x] `features/avatar/avatar-renderer.tsx` (camadas na ordem de §1, tamanhos 32/64/160/256).
- [x] `features/avatar/avatar-editor.tsx`: prévia grande, abas por categoria com miniaturas, opção "nenhum" nas opcionais, botão **Aleatório**, atualização imediata.
- [x] Tela `/perfil` com editor + campo de nickname (validação do schema compartilhado, mensagens em pt-BR) e **Salvar**; volta para a tela de origem (`?next=`).
- [x] Primeira visita: avatar aleatório, nickname vazio (R4). Perfil salvo com IDs inválidos é saneado (`sanitizeAvatar`).
- [x] `PlayerChip` passa a usar `AvatarRenderer`.
- [x] Script `pnpm avatars:check` (`apps/web/scripts/check-avatars.ts`): todo `file` existe, nenhum arquivo órfão, IDs únicos, SVG sem `<script`, atributos `on*`, `<image` ou URLs externas.

## Fora do escopo
- Artes definitivas (o criador do projeto adiciona depois, seguindo `docs/avatares.md` §4).

## Critérios de aceite
- [x] Trocar qualquer opção muda a prévia sem atraso perceptível.
- [x] Editor utilizável por teclado (abas e opções focáveis, seleção com Enter/Espaço).
- [x] `pnpm avatars:check` roda no CI (adicione ao job `check`).

## Testes obrigatórios
- [x] `randomAvatar` com `SeededRng` é determinístico e sempre válido.
- [x] `sanitizeAvatar` mantém categorias válidas e troca só as inválidas.
- [x] Editor: clicar numa opção atualiza a prévia e o estado; "nenhum" grava `null`.
- [x] Nickname: vazio e longo demais mostram erro e bloqueiam salvar.
- [x] Checker: detecta arquivo ausente, órfão, ID duplicado e SVG com `<script>`.

## Notas

Pedido do criador do projeto, além dos entregáveis acima: as artes provisórias são geradas por código no estilo do skribbl.io, com tamanhos padronizados, e o guia [`docs/avatares-guia-de-artes.md`](../avatares-guia-de-artes.md) reúne tudo para desenhar as definitivas. O gabarito também sai em PNG 1024 × 1024 para programas de pintura, e `pnpm avatars:generate` regera as provisórias sem nunca sobrescrever uma arte definitiva ([D20](../decisoes.md)).
