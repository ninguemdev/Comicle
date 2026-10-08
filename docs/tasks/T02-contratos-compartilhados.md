# T02 — Contratos compartilhados (`@comicle/shared`)

**Depende de:** T01 · **Pacotes:** shared · **Branch:** `task/02-contratos-compartilhados`

## Objetivo
Tipos, schemas Zod, constantes, códigos de erro e eventos tipados que cliente e servidor vão usar. Este pacote é a implementação de `docs/protocolo-realtime.md`.

## Leia antes
- `docs/protocolo-realtime.md` (todo)
- `docs/regras-do-jogo.md` §1, §2, §4, §6
- `docs/avatares.md` §1, §2

## Entregáveis
- [ ] `constants.ts` com **todas** as constantes da tabela de `regras-do-jogo.md` §1, com os mesmos nomes.
- [ ] `errors.ts`: `ErrorCode` (objeto `as const` + tipo união) e helper `isErrorCode`.
- [ ] `domain/`: `PlayerProfile`, `AvatarConfig`, `MatchSettings`, `MemberRole`, `MatchPhase`, `PlayerView`, `MemberView`, `MatchView`, `PlayerTask`, `PanelRef`, `ArtistRef`, `PresentationView`, `PresentationStep`, `Ack<T>`.
- [ ] `text.ts`: `normalizeText(s)` (R1/R27: trim, colapsa espaços, remove caracteres de controle) e `codePointLength(s)`.
- [ ] `schemas/`: Zod para nickname (R1), tema (R27), código de sala (R6, com normalização), `AvatarConfig` validado contra o catálogo (R2), `MatchSettings` (R18; rejeita `individual`, R21) e o payload de **cada** evento cliente→servidor.
- [ ] `avatar/catalog.json` com as 6 categorias e **2 opções por categoria obrigatória e 1 por opcional** (apenas IDs e caminhos; os arquivos vêm na T07) e `avatar/catalog.ts` (parse com Zod, `isValidAvatar`, `defaultAvatar`, `randomAvatar(rng)`, `sanitizeAvatar` — R2).
- [ ] `events.ts`: `ClientToServerEvents` e `ServerToClientEvents` (tipos do Socket.IO com ack tipado) e `clientEventSchemas` (mapa evento → schema) para os handlers usarem.
- [ ] `ack.ts`: `ok(data)`, `fail(code, message)`.
- [ ] `index.ts` reexportando tudo.

## Fora do escopo
- Lógica de jogo (distribuição, cursor, projeção) — fica no servidor.

## Critérios de aceite
- [ ] Nenhuma dependência de runtime além de Zod.
- [ ] Os tipos de `PlayerView` batem campo a campo com `protocolo-realtime.md` §5.
- [ ] Web e server conseguem importar `@comicle/shared` (smoke test de import em cada um).

## Testes obrigatórios
- [ ] R1: nickname normalizado; vazio, só espaços e 21 code points rejeitados; emoji conta como 1.
- [ ] R2: avatar com ID inexistente, ID da categoria errada e obrigatória `null` são rejeitados; opcionais aceitam `null`; `sanitizeAvatar` troca só a categoria inválida.
- [ ] R6: código normalizado (`" k7pq2m "` → `"K7PQ2M"`); caracteres fora do alfabeto rejeitados.
- [ ] R18/R21: `fixed` fora de 2–12, `drawingSeconds` fora das opções e `mode: 'individual'` rejeitados.
- [ ] R27: tema com 2 caracteres e com 141 rejeitado; normalização aplicada.
- [ ] Constantes: teste que confere os valores da tabela de §1 (protege contra alteração acidental).

## Notas
- Prefira `z.infer` para derivar tipos dos schemas quando o tipo for de entrada; os tipos de saída (`PlayerView`) podem ser declarados à mão.
- Para bytes (`png`), use `z.custom<Uint8Array>((v) => v instanceof Uint8Array)` — o `Buffer` do Node passa nessa checagem.
