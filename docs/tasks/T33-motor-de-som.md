# T33 — Motor de som e volume

**Depende de:** T21 · **Pacotes:** web · **Branch:** `task/33-motor-de-som` · **Versão:** 1.1

## Objetivo
A base dos sons da v1.1: o catálogo sintetizado com a Web Audio API, o motor que toca respeitando o volume e o controle de volume na tela inicial. Os sons ainda não são ligados aos eventos da partida (T34).

## Leia antes
- `docs/sons.md` (todo)
- `docs/interface.md` §1 (Aparência) e §6
- `docs/modelo-de-dados.md` (localStorage)

## Entregáveis
- [ ] `features/sound/sound-catalog.ts`: as receitas de `docs/sons.md` §2 como dados puros.
- [ ] `features/sound/sound-engine.ts`: `AudioContext` criado no primeiro gesto, ganho mestre, no-op sem Web Audio.
- [ ] `stores/sound-store.ts`: volume e silenciar, persistidos em `comicle.sound`.
- [ ] `VolumeControl` na tela inicial, abaixo de **Aparência**: botão silenciar/ativar e barra de volume com prévia.
- [ ] `/dev/sons` (só em desenvolvimento) para ouvir cada som.
- [ ] `interface.md`, `modelo-de-dados.md`, `AGENTS.md` (escopo), `especificacao-produto.md` (v1.1), D47.

## Fora do escopo
- Tocar sons nos eventos da partida (T34). Música e sons por traço de desenho (`docs/sons.md` §3).

## Critérios de aceite
- [ ] Num navegador real, os sons de `/dev/sons` tocam no volume escolhido, e silenciar cala todos.
- [ ] A escolha de volume sobrevive a recarregar a página.
- [ ] Sem Web Audio, nada quebra.

## Testes obrigatórios
- [ ] Catálogo: duração máxima, frequências audíveis, envelopes que terminam em silêncio.
- [ ] Motor com `AudioContext` falso: ganho mestre, silenciar, no-op sem suporte, nada antes do primeiro gesto.
- [ ] Store: padrão, persistência, valor inválido.
- [ ] Tela inicial: controle acessível por papel e nome.
