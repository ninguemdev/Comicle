---
description: Executa uma task do backlog do início ao PR (ex.: /task 08)
argument-hint: <número da task, ex. 08>
---

Execute a task **T$ARGUMENTS** seguindo exatamente o fluxo de `AGENTS.md` e `docs/tasks/README.md`.

1. Leia `docs/tasks/README.md`. Confirme que todas as dependências da T$ARGUMENTS estão ✅. Se não estiverem, pare e me diga quais faltam.
2. Abra o arquivo `docs/tasks/T$ARGUMENTS-*.md` e **todos** os documentos listados em "Leia antes".
3. Verifique o estado do git: árvore limpa, `main` atualizada (`git switch main && git pull --ff-only`). Crie o branch indicado na task.
4. Se algo estiver ambíguo, conflitar entre documentos ou exigir uma decisão de produto, pare e pergunte antes de escrever código.
5. Para tasks grandes, apresente um plano curto (arquivos e ordem) e aguarde minha aprovação.
6. Marque a task como 🟨 no índice e implemente em commits pequenos no padrão Conventional Commits (pt-BR), **sem nenhuma linha de coautoria ou atribuição**.
7. Escreva os testes obrigatórios da task, citando os IDs `Rnn` nos nomes.
8. Rode `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (e `pnpm test:db` / `pnpm e2e` quando aplicável) até tudo passar.
9. Atualize a documentação afetada, marque a checklist da task e o status ✅ no índice.
10. Faça push do branch e abra o PR com `gh pr create`, título no formato `tipo(escopo): descrição (T$ARGUMENTS)` e corpo seguindo `.github/pull_request_template.md`, sem rodapé de atribuição.
11. Pare. Responda com um resumo do que foi feito, o link do PR e qualquer ponto que eu precise decidir. Não faça merge.
