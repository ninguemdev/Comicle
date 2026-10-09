# T13 — Editor de desenho

**Depende de:** T06 · **Pacotes:** web · **Branch:** `task/13-editor-desenho`

## Objetivo
Editor de desenho rápido e expressivo em Canvas 2D, bom com mouse, caneta e toque, isolado da partida (recebe props, devolve PNG).

## Leia antes
- `docs/interface.md` §4 (todo)
- `docs/regras-do-jogo.md` R39, R40, R48
- `docs/decisoes.md` D4, D5

## Entregáveis
- [x] `features/drawing/engine/` (TS puro, sem React):
  - [x] `drawing-document.ts`: operações `stroke` e `clear`, `baseImage`, desfazer/refazer (até 100), `isEmpty`, `revision` (contador para detectar mudanças).
  - [x] `coordinates.ts`: conversão de coordenadas de tela → espaço lógico 1024×768.
  - [x] `smoothing.ts`: curvas quadráticas por pontos médios.
  - [x] `pointer-policy.ts`: um ponteiro por vez e rejeição de palma (toque ignorado durante traço de caneta).
  - [x] `renderer.ts`: desenha operações num `CanvasRenderingContext2D`, com snapshot em cache a cada 20 operações.
  - [x] `export.ts`: `exportPng(doc): Promise<Uint8Array | null>` (canvas offscreen 1024×768, fundo branco).
- [x] `features/drawing/drawing-canvas.tsx`: Pointer Events, `setPointerCapture`, `getCoalescedEvents`, `touch-action: none`, `devicePixelRatio`, redimensionamento mantendo 4:3.
- [x] `features/drawing/toolbar.tsx`: pincel, borracha, 16 cores + seletor livre, 4 espessuras, desfazer, refazer, limpar (com confirmação), layouts desktop/mobile de `interface.md` §4.
- [x] Atalhos de teclado da tabela de §4.
- [x] `DrawingEditor` (API pública): `{ baseImageUrl?, disabled, onChange(revision), ref.exportPng() }`.
- [x] Rota `/dev/editor` (só em dev) para testar o editor isolado.

## Fora do escopo
- Autosave, envio e timer (T15).

## Critérios de aceite
- [x] Traço fluido em celular (sem rolar a página ao desenhar) e em desktop.
- [x] O PNG exportado tem exatamente 1024×768, independente do tamanho da tela.
- [x] `baseImage` aparece por baixo dos novos traços e não pode ser desfeita.

## Testes obrigatórios (engine pura)
- [x] Desfazer/refazer, limite de 100, `clear` desfazível, novo traço limpa a pilha de refazer.
- [x] `isEmpty` e `exportPng` → `null` sem operações nem `baseImage`.
- [x] Conversão de coordenadas para vários tamanhos e DPRs.
- [x] `pointer-policy`: segundo ponteiro ignorado; toque ignorado durante caneta.
- [x] Atalhos de teclado disparam as ações corretas (teste de componente).

## Notas
- Se precisar de canvas no jsdom, `vitest-canvas-mock` é aceitável como dependência de desenvolvimento (registre em `docs/decisoes.md`). Prefira manter a lógica fora do canvas para testá-la sem mock.
