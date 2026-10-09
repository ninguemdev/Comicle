# Tasks

O projeto é construído em tasks pequenas e sequenciais. Cada task vira **um branch e um PR**. Este arquivo é o **único lugar** onde o status é registrado.

Legenda: ⬜ pendente · 🟨 em andamento · ✅ concluída

| # | Task | Depende de | Status |
|---|---|---|---|
| T01 | [Bootstrap do monorepo](./T01-bootstrap-monorepo.md) | — | ✅ |
| T02 | [Contratos compartilhados](./T02-contratos-compartilhados.md) | T01 | ✅ |
| T03 | [Servidor base](./T03-servidor-base.md) | T02 | ✅ |
| T04 | [Persistência](./T04-persistencia.md) | T03 | ✅ |
| T05 | [Identidade de convidado](./T05-identidade-convidado.md) | T03 | ✅ |
| T06 | [Web base e design system](./T06-web-base.md) | T02 | ✅ |
| T07 | [Avatares](./T07-avatares.md) | T06 | ✅ |
| T08 | [Salas no servidor](./T08-salas-servidor.md) | T04, T05 | ✅ |
| T09 | [Telas de início e lobby](./T09-telas-inicio-lobby.md) | T07, T08 | ✅ |
| T10 | [Distribuição das histórias](./T10-distribuicao-historias.md) | T02 | ✅ |
| T11 | [Motor de partida e etapa de temas](./T11-motor-partida-temas.md) | T08, T10 | ✅ |
| T12 | [Rodadas no servidor](./T12-rodadas-servidor.md) | T11 | ✅ |
| T13 | [Editor de desenho](./T13-editor-desenho.md) | T06 | ✅ |
| T14 | [Página de HQ](./T14-pagina-hq.md) | T06 | ✅ |
| T15 | [Fluxo da partida no cliente](./T15-fluxo-partida-web.md) | T09, T12, T13, T14 | ⬜ |
| T16 | [Apresentação no servidor](./T16-apresentacao-servidor.md) | T12 | ⬜ |
| T17 | [Apresentação no cliente](./T17-apresentacao-web.md) | T15, T16 | ⬜ |
| T18 | [Resiliência e reconexão](./T18-resiliencia-reconexao.md) | T17 | ⬜ |
| T19 | [Segurança e limites](./T19-seguranca-limites.md) | T17 | ⬜ |
| T20 | [Testes ponta a ponta](./T20-e2e.md) | T18, T19 | ⬜ |
| T21 | [Acessibilidade e polimento](./T21-acessibilidade-polimento.md) | T17 | ⬜ |
| T22 | [Produção e deploy](./T22-producao-deploy.md) | T19 | ⬜ |

Podem andar em paralelo, se houver mais de uma pessoa ou sessão: T06/T07/T13/T14 (cliente) com T03–T05/T08/T10–T12 (servidor).

**Marco jogável:** ao fim da T17 existe uma partida completa de ponta a ponta. T18–T22 deixam o jogo robusto e publicável.

---

## Fluxo de uma task

1. **Escolher.** A task indicada pelo usuário, ou a primeira ⬜ cuja dependência está ✅.
2. **Branch.** `git switch main && git pull --ff-only && git switch -c task/NN-slug` (ex.: `task/08-salas-servidor`).
3. **Ler.** O arquivo da task e todo documento listado em "Leia antes". Se algo estiver ambíguo ou conflitar com outro documento, **pare e pergunte** antes de implementar.
4. **Marcar.** Neste arquivo, status 🟨 (primeiro commit do branch, junto com o código ou sozinho: `docs(tasks): inicia T08`).
5. **Implementar** em commits pequenos e coerentes (Conventional Commits, ver `AGENTS.md`).
6. **Verificar.** `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` — e `pnpm test:db` se tocou no banco, `pnpm e2e` a partir da T20. Tudo verde.
7. **Documentar.** Se uma regra, contrato ou decisão mudou, atualize `docs/` no mesmo branch.
8. **Fechar.** Status ✅ neste arquivo e checklist da task marcada. Último commit: `docs(tasks): conclui T08`.
9. **PR.** `git push -u origin task/NN-slug` e `gh pr create --base main --title "<título>" --body "<corpo>"`, com o corpo seguindo `.github/pull_request_template.md`. Título no formato Conventional Commits com o número da task: `feat(server): salas multiplayer (T08)`.
10. **Esperar.** O merge (squash) é feito pelo usuário. Não faça merge nem inicie a próxima task sem o usuário pedir.

## Modelo de task

```markdown
# TNN — Título

**Depende de:** TXX · **Pacotes:** web | server | shared · **Branch:** `task/NN-slug`

## Objetivo
Uma ou duas frases sobre o resultado.

## Leia antes
- docs/... §x (Rnn–Rmm)

## Entregáveis
- [ ] ...

## Fora do escopo
- ...

## Critérios de aceite
- [ ] ...

## Testes obrigatórios
- [ ] ...

## Notas
Dicas de implementação, armadilhas conhecidas.
```

Para espelhar as tasks como issues do GitHub (opcional), use `scripts/sync-tasks-to-issues.sh`.
