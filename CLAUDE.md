# CLAUDE.md

As instruções do projeto estão em `AGENTS.md`, importado abaixo. Ele vale integralmente para o Claude Code.

@AGENTS.md

## Específico do Claude Code

- Comece cada sessão lendo `docs/tasks/README.md` para saber o status. Para executar uma task, use `/task NN`; para revisar o trabalho antes do PR, `/revisar`.
- Use o modo de planejamento em tasks grandes (T08, T11, T12, T13, T15): apresente o plano e espere aprovação antes de editar.
- Ao abrir ou atualizar um PR, a descrição não leva rodapé de atribuição de nenhum tipo.
- Prefira subagentes apenas para buscas amplas no código; implemente diretamente.
- Ao terminar, responda com: o que foi feito, o link do PR e qualquer decisão que o usuário precise validar.
