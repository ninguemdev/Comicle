---
description: Revisa o branch atual contra a task e a Definition of Done antes do PR
---

Revise o trabalho do branch atual como um revisor exigente, sem alterar código ainda.

1. Identifique a task pelo nome do branch (`task/NN-…`) e leia o arquivo dela e os documentos de "Leia antes".
2. Veja o diff completo contra `main` (`git diff main...HEAD`) e o log de commits.
3. Confira, item a item:
   - critérios de aceite e testes obrigatórios da task;
   - regras de arquitetura de `AGENTS.md` (autoridade do servidor, domínio puro, projeção, fila por sala, handlers finos, contratos em `@hq/shared`, componentes sem socket, sem números mágicos);
   - testes citando `Rnn` para cada regra tocada;
   - textos de interface só em `strings/pt-BR.ts`;
   - documentação atualizada quando regra, contrato ou decisão mudou;
   - mensagens de commit em Conventional Commits, sem nenhuma linha de coautoria ou atribuição;
   - código morto, `TODO` sem task, `any`, `as` suspeitos, logs com dados sensíveis.
4. Rode `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
5. Responda com uma lista objetiva: ✅ ok, ⚠️ melhorias opcionais, ❌ bloqueios (com arquivo e linha). Pergunte se deve corrigir os bloqueios.
