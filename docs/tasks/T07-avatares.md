# T07 — Avatares

**Depende de:** T06 · **Pacotes:** web, shared · **Branch:** `task/07-avatares`

## Objetivo
Sistema de avatares em camadas com artes provisórias, editor visual com prévia imediata, nickname e persistência local do perfil.

## Leia antes
- `docs/avatares.md` (todo)
- `docs/interface.md` §2 (Personalização)
- `docs/regras-do-jogo.md` R1, R2, R4

## Entregáveis
- [ ] `catalog.json` completo, com 4 a 6 opções provisórias por categoria (mantendo os IDs criados na T02).
- [ ] SVGs provisórios em `apps/web/public/avatars/<categoria>/` seguindo `avatares.md` §3, e o gabarito `_template.svg`.
- [ ] `features/avatar/avatar-renderer.tsx` (camadas na ordem de §1, tamanhos 32/64/160/256).
- [ ] `features/avatar/avatar-editor.tsx`: prévia grande, abas por categoria com miniaturas, opção "nenhum" nas opcionais, botão **Aleatório**, atualização imediata.
- [ ] Tela `/perfil` com editor + campo de nickname (validação do schema compartilhado, mensagens em pt-BR) e **Salvar**; volta para a tela de origem (`?next=`).
- [ ] Primeira visita: avatar aleatório, nickname vazio (R4). Perfil salvo com IDs inválidos é saneado (`sanitizeAvatar`).
- [ ] `PlayerChip` passa a usar `AvatarRenderer`.
- [ ] Script `pnpm avatars:check` (`apps/web/scripts/check-avatars.ts`): todo `file` existe, nenhum arquivo órfão, IDs únicos, SVG sem `<script`, atributos `on*`, `<image` ou URLs externas.

## Fora do escopo
- Artes definitivas (o criador do projeto adiciona depois, seguindo `docs/avatares.md` §4).

## Critérios de aceite
- [ ] Trocar qualquer opção muda a prévia sem atraso perceptível.
- [ ] Editor utilizável por teclado (abas e opções focáveis, seleção com Enter/Espaço).
- [ ] `pnpm avatars:check` roda no CI (adicione ao job `check`).

## Testes obrigatórios
- [ ] `randomAvatar` com `SeededRng` é determinístico e sempre válido.
- [ ] `sanitizeAvatar` mantém categorias válidas e troca só as inválidas.
- [ ] Editor: clicar numa opção atualiza a prévia e o estado; "nenhum" grava `null`.
- [ ] Nickname: vazio e longo demais mostram erro e bloqueiam salvar.
- [ ] Checker: detecta arquivo ausente, órfão, ID duplicado e SVG com `<script>`.
