# T06 — Web base e design system

**Depende de:** T02 · **Pacotes:** web · **Branch:** `task/06-web-base`

## Objetivo
Fundação do cliente: identidade visual, componentes base, roteamento, configuração, cliente HTTP e Socket.IO tipados, sincronia de tempo e stores.

## Leia antes
- `docs/interface.md` §1, §2, §6
- `docs/arquitetura.md` §3 (regras 6 e 7), §5, §6
- `docs/protocolo-realtime.md` §1, §2, §6
- `docs/regras-do-jogo.md` R3, R4

## Entregáveis
- [ ] Tailwind 4 com `src/styles/theme.css` contendo os tokens de `interface.md` §1; fontes Bangers e Nunito via `@fontsource`.
- [ ] `config/env.ts` (Zod) para `VITE_SERVER_URL` e `VITE_BASE_PATH`; router com `basename`.
- [ ] Rotas: `/`, `/perfil`, `/sala/:code` (telas placeholder) e página 404 no estilo do jogo.
- [ ] `lib/storage.ts`: wrapper de `localStorage` que tolera exceções (modo privado) e valida com Zod ao ler.
- [ ] `lib/http-client.ts`: `fetch` com base URL, `Authorization` e parse de `{ error: { code } }`.
- [ ] `lib/session.ts`: boot da sessão (R3) — valida token salvo, cria novo se 401, guarda em `hq.session`.
- [ ] `lib/socket-client.ts`: cliente Socket.IO tipado com `@hq/shared`, `auth.token`, `emitWithAck` com timeout que sempre resolve um `Ack` (timeout → `fail('INTERNAL', …)`), estado de conexão.
- [ ] `lib/time-sync.ts`: algoritmo de `protocolo-realtime.md` §6 (função pura de cálculo + agendador).
- [ ] Stores Zustand: `session-store`, `profile-store` (persistido em `hq.profile`), `room-store` (última `PlayerView`, status de conexão, ações).
- [ ] `strings/pt-BR.ts` com as strings usadas até aqui e mapa `ErrorCode → mensagem`.
- [ ] `ui/`: `Button`, `Card`, `Dialog`, `Timer`, `ProgressPill`, `SpeechBubble`, `PlayerChip` (aceita avatar como slot até a T07), `Toast`, `ConnectionBanner`.
- [ ] Página `/dev/ui` (só em `import.meta.env.DEV`) mostrando todos os componentes — ajuda a revisar a identidade visual.

## Fora do escopo
- Avatares (T07), telas reais (T09+).

## Critérios de aceite
- [ ] Nenhum componente importa `socket-client` diretamente (regra de lint ativa).
- [ ] Nenhum texto literal em componentes (tudo de `strings/pt-BR.ts`).
- [ ] Layout funciona em 360px de largura sem rolagem horizontal.

## Testes obrigatórios
- [ ] `time-sync`: escolhe a amostra de menor RTT e calcula o offset corretamente.
- [ ] `Timer`: com offset e `vi.useFakeTimers()`, mostra o restante correto e nunca negativo; anuncia 30 s, 10 s e 0 via `aria-live`.
- [ ] `storage`: `localStorage` que lança exceção não quebra a aplicação; valor corrompido é ignorado.
- [ ] `session`: token salvo válido é reaproveitado; 401 cria sessão nova (fetch mockado).
- [ ] `emitWithAck`: timeout resolve com `ok: false`.
- [ ] `Dialog`: foco preso, `Esc` fecha, foco volta ao gatilho.

## Notas
- Antes de desenhar os componentes, defina a direção visual seguindo `interface.md` §1 e mantenha consistência — essa base será reaproveitada em todas as telas.
