# T34 — Sons nos eventos do jogo

**Depende de:** T33 · **Pacotes:** web · **Branch:** `task/34-sons-na-partida` · **Versão:** 1.1

## Objetivo
Ligar o catálogo da T33 aos momentos do jogo de `docs/sons.md` §2 e §3: cliques, entrada e saída na sala, início da partida, vez de jogar, avisos de prazo, envio recebido, revelação na apresentação e erros.

## Leia antes
- `docs/sons.md` §2 e §3
- `docs/regras-do-jogo.md` R26, R34–R38, R51–R53, R61
- `apps/web/src/features/room/room-announcer.tsx` (mesmo padrão de comparar views)

## Entregáveis
- [ ] `useGameSounds`: compara a `PlayerView` anterior com a nova e pede os sons; nada na primeira view.
- [ ] Avisos de prazo (30 s, 10 s, tique-taque nos últimos 5 s, fim) pelo relógio corrigido do `Timer`.
- [ ] `click` no `Button`, `toggle` nas ferramentas e opções, `error` no `Toast` de erro.
- [ ] `docs/sons.md` e `interface.md` §6 atualizados se algo mudar.

## Critérios de aceite
- [ ] Numa partida real, cada momento do catálogo toca uma vez, sem som repetido ao reconectar.
- [ ] Silenciado na tela inicial, a partida inteira fica em silêncio.

## Testes obrigatórios
- [ ] `useGameSounds` com sequências de views (lobby → temas → desenho → leitura → apresentação, entrada e saída de membros, reconexão).
- [ ] Prazos: 30 s, 10 s, 5…1 s e fim, uma vez cada.
- [ ] Botão, ferramentas e toast de erro pedem o som certo.
