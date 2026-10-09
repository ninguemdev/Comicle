# T19 — Segurança e limites

**Depende de:** T17 · **Pacotes:** server, web · **Branch:** `task/19-seguranca-limites`

## Objetivo
Auditar e cobrir com testes tudo o que protege a partida: validação, limites, autorização, privacidade dos quadros e higiene de logs.

## Leia antes
- `docs/arquitetura.md` §7
- `docs/regras-do-jogo.md` R12, R58–R61
- `docs/especificacao-produto.md` §12, §15

## Entregáveis
- [x] Matriz de autorização de ações de anfitrião: cada ação exclusiva × (anfitrião, membro, espectador, não membro) com o resultado esperado, como teste parametrizado.
- [x] Matriz de privacidade (R58): para cada fase e cada papel, a `PlayerView` não contém nada além do permitido (teste parametrizado sobre partidas geradas).
- [x] Matriz de acesso a imagens (R59): todo `panelId` existente × todo jogador × cada momento da partida.
- [x] Rate limits revisados e testados (HTTP e socket), incluindo varredura de códigos de sala (`room:join` e `GET /api/rooms/:code`).
- [x] Limites de tamanho: payloads de texto (schemas), `maxHttpBufferSize`, imagem.
- [x] Teste de robustez dos schemas com entradas aleatórias (`fast-check` como dependência de desenvolvimento — registre em `docs/decisoes.md`): nenhum payload derruba o handler ou gera `INTERNAL`.
- [x] CSP do `helmet` validada com o build de produção do web (sem erros no console).
- [x] `pino.redact` cobrindo tokens e imagens; teste que nenhum log contém token ou tema.
- [x] Seção §7 de `docs/arquitetura.md` atualizada com o que foi verificado e os limites finais.

## Critérios de aceite
- [x] Nenhum caminho do servidor responde `INTERNAL` para entrada malformada.
- [x] Nenhuma ação de anfitrião é executável por outra sessão.

## Testes obrigatórios
- [x] As três matrizes acima.
- [x] Rate limit de cada categoria.
- [x] Teste de propriedade dos schemas.
- [x] Logs sem dados sensíveis.
