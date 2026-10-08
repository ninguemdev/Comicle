# T21 — Acessibilidade e polimento

**Depende de:** T17 · **Pacotes:** web · **Branch:** `task/21-acessibilidade-polimento`

## Objetivo
Deixar a experiência redonda: acessível, responsiva, com estados vazios e de erro caprichados e identidade visual consistente em todas as telas.

## Leia antes
- `docs/interface.md` (todo)
- `docs/especificacao-produto.md` §11, §13

## Entregáveis
- [ ] Revisão de todas as telas em 360×640, 768×1024 e 1440×900 (capturas anexadas ao PR).
- [ ] `@axe-core/playwright` nos specs E2E (se a T20 já estiver concluída) ou em um spec dedicado, sem violações sérias.
- [ ] Navegação por teclado completa fora do canvas; foco visível; ordem lógica.
- [ ] `aria-live` revisado (fases, progresso, timer em 30 s/10 s/0).
- [ ] Movimento reduzido respeitado em todas as animações.
- [ ] Estados de carregamento, erro e vazio em todas as telas; `ErrorBoundary` com tela amigável.
- [ ] Revisão de microtexto em `strings/pt-BR.ts` (tom leve, frases curtas, sem jargão técnico).
- [ ] Favicon, título por tela, meta tags básicas, `lang="pt-BR"`.
- [ ] Sons? **Não** — fora do escopo da v1.

## Critérios de aceite
- [ ] Nenhuma violação crítica ou séria do axe.
- [ ] Nenhuma rolagem horizontal em 360px.
- [ ] Contraste AA em todo texto.

## Testes obrigatórios
- [ ] Verificações axe automatizadas.
- [ ] Testes de componente para foco do `Dialog` e anúncios do `Timer` (se ainda não existirem).
