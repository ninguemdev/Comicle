# T38 — Modo individual: apresentação das versões

**Depende de:** T37 · **Pacotes:** shared, server, web · **Branch:** `task/38-individual-apresentacao-das-versoes` · **Versão:** 1.1

## Objetivo
A apresentação (`especificacao-produto.md` §9.5) por tema: o tema e, em seguida, todas as versões dele, cada uma com revelação quadro a quadro, HQ completa e download (R68).

## Leia antes
- `docs/especificacao-produto.md` §9
- `docs/regras-do-jogo.md` §10 (R50–R57) e §12 (R68)
- `docs/decisoes.md` D48

## Decisões (D48)
- Ordem por tema: temas na ordem dos assentos dos autores; para cada um, as versões na ordem do R64.

## Entregáveis
- [ ] Cursor da apresentação para o modo individual: tema → versão (quadros um a um → completa) → próxima versão → próximo tema; navegação equivalente à do R52 (próxima versão, próximo tema, ir para uma versão já alcançada).
- [ ] Acesso às imagens equivalente ao R54, por versão.
- [ ] Cliente: cabeçalho com o tema e o autor, "Versão de {artista} (k de N − 1)", e a lista de temas e versões para o anfitrião.
- [ ] Baixar a HQ de cada versão (D40, D44).
- [ ] Atualizar `protocolo-realtime.md` e `interface.md`.

## Critérios de aceite
- [ ] O anfitrião percorre todos os temas e versões; todos veem o mesmo passo.
- [ ] Nenhuma versão fica acessível antes de ser alcançada.

## Testes obrigatórios
- [ ] R68: ordem e navegação do cursor no modo individual.
- [ ] Acesso às imagens na apresentação individual.
- [ ] E2E: apresentação de uma partida individual até o fim.

## Notas
Task grande: usar o modo de planejamento e apresentar o plano antes de editar.
