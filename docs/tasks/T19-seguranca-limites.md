# T19 — Segurança e limites

**Depende de:** T17 · **Pacotes:** server, web · **Branch:** `task/19-seguranca-limites`

## Objetivo
Auditar e cobrir com testes tudo o que protege a partida: validação, limites, autorização, privacidade dos quadros e higiene de logs.

## Leia antes
- `docs/arquitetura.md` §7
- `docs/regras-do-jogo.md` R12, R58–R61
- `docs/especificacao-produto.md` §12, §15

## Entregáveis
- [ ] Matriz de autorização de ações de anfitrião: cada ação exclusiva × (anfitrião, membro, espectador, não membro) com o resultado esperado, como teste parametrizado.
- [ ] Matriz de privacidade (R58): para cada fase e cada papel, a `PlayerView` não contém nada além do permitido (teste parametrizado sobre partidas geradas).
- [ ] Matriz de acesso a imagens (R59): todo `panelId` existente × todo jogador × cada momento da partida.
- [ ] Rate limits revisados e testados (HTTP e socket), incluindo varredura de códigos de sala (`room:join` e `GET /api/rooms/:code`).
- [ ] Limites de tamanho: payloads de texto (schemas), `maxHttpBufferSize`, imagem.
- [ ] Teste de robustez dos schemas com entradas aleatórias (`fast-check` como dependência de desenvolvimento — registre em `docs/decisoes.md`): nenhum payload derruba o handler ou gera `INTERNAL`.
- [ ] CSP do `helmet` validada com o build de produção do web (sem erros no console).
- [ ] `pino.redact` cobrindo tokens e imagens; teste que nenhum log contém token ou tema.
- [ ] Seção §7 de `docs/arquitetura.md` atualizada com o que foi verificado e os limites finais.

## Critérios de aceite
- [ ] Nenhum caminho do servidor responde `INTERNAL` para entrada malformada.
- [ ] Nenhuma ação de anfitrião é executável por outra sessão.

## Testes obrigatórios
- [ ] As três matrizes acima.
- [ ] Rate limit de cada categoria.
- [ ] Teste de propriedade dos schemas.
- [ ] Logs sem dados sensíveis.
