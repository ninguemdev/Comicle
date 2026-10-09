# Protocolo cliente ↔ servidor

Contrato entre `apps/web` e `apps/server`. Os tipos e schemas Zod correspondentes vivem em `packages/shared` e são a implementação deste documento: se divergirem, o PR que mudou um muda o outro.

Princípios:

1. **O servidor é autoritativo.** O cliente envia intenções; o servidor valida, decide e publica o estado.
2. **Estado por projeção.** Depois de qualquer mudança, o servidor envia a cada jogador a sua `PlayerView` completa (`room:view`). Não há eventos incrementais de estado: reconectar é simplesmente receber a view de novo.
3. **Toda ação tem ack.** Eventos do cliente recebem uma resposta `Ack<T>`.
4. **Toda entrada é validada** com o schema Zod do evento antes de chegar ao serviço.

---

## 1. HTTP

Base: `/api`. JSON, exceto imagens. Autenticação por `Authorization: Bearer <token>` quando indicado.

| Método e rota | Auth | Resposta | Observações |
|---|---|---|---|
| `POST /api/guest-sessions` | — | `201 { token, expiresAt }` | `expiresAt` em ms epoch do servidor (renovado a cada uso, R3); rate limit de 10/min por IP → `429 RATE_LIMITED` |
| `GET /api/guest-sessions/me` | Bearer | `200 { guestId }` ou `401 UNAUTHORIZED` | Usado no boot do cliente para validar o token salvo; também renova a sessão |
| `GET /api/rooms/:code` | — | `200 { code, status, memberCount, joinable }` ou `404 ROOM_NOT_FOUND` | Pré-checagem antes de entrar; o código é normalizado (R6) e um código mal formado responde como inexistente. `joinable` = sala não cheia (R9); a rota é anônima, então reconexão e expulsão (R12) só se resolvem no `room:join`. Rate limit de 30/min por IP (proteção contra varredura de códigos) |
| `GET /api/panels/:panelId` | Bearer | `200 image/png` · `403` · `404` | Consulta `PanelAccessPolicy`; `Cache-Control: private, no-store` |
| `GET /api/rooms/:code/my-draft` | Bearer | `200 image/png` ou `204` | Último autosave do próprio jogador na rodada de desenho atual (R48) |
| `GET /healthz` | — | `200 { status: 'ok' }` · `503 { error: { code: 'INTERNAL' } }` | Também verifica o banco (`select 1`); 503 quando ele não responde |

Erros HTTP usam o corpo `{ error: { code, message } }`, com os mesmos `ErrorCode` do realtime. Status por código: `INVALID_PAYLOAD` e `IMAGE_INVALID` 400 · `UNAUTHORIZED` 401 · `KICKED`, `NOT_IN_ROOM` e `NOT_HOST` 403 · `ROOM_NOT_FOUND` 404 · `ROOM_FULL`, `INVALID_STATE`, `NOT_ENOUGH_PLAYERS` e `DEADLINE_PASSED` 409 · `ROOM_CLOSED` 410 · `IMAGE_TOO_LARGE` 413 · `RATE_LIMITED` 429 · `INTERNAL` 500. Outros erros 4xx do Fastify (JSON malformado, por exemplo) saem como `INVALID_PAYLOAD` com o status original; nenhum erro expõe stack trace.

O cliente carrega imagens com `fetch` + `Authorization` e cria `blob:` URLs (hook `usePanelImage`), revogando-as ao desmontar. O token nunca vai em query string.

---

## 2. Conexão Socket.IO

- Caminho padrão `/socket.io`, transporte WebSocket com fallback padrão do Socket.IO.
- Handshake: `io(SERVER_URL, { auth: { token } })`. O middleware valida (e renova) o token; inválido ou ausente → `connect_error` com `message === 'UNAUTHORIZED'` e `data.code === 'UNAUTHORIZED'`, e o cliente cria nova sessão.
- `maxHttpBufferSize`: 3 MiB (acomoda `PANEL_MAX_BYTES` + envelope).
- Um socket participa de no máximo uma sala.

### Envelope de ack

```ts
type Ack<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

### Códigos de erro (`ErrorCode`)

`INVALID_PAYLOAD` · `UNAUTHORIZED` · `RATE_LIMITED` · `ROOM_NOT_FOUND` · `ROOM_FULL` · `ROOM_CLOSED` · `KICKED` · `NOT_IN_ROOM` · `NOT_HOST` · `INVALID_STATE` · `NOT_ENOUGH_PLAYERS` · `DEADLINE_PASSED` · `IMAGE_INVALID` · `IMAGE_TOO_LARGE` · `INTERNAL`

`message` é em pt-BR e pode ser exibida ao usuário; o cliente decide o texto final pelo `code` (strings em `apps/web/src/strings/pt-BR.ts`).

---

## 3. Eventos cliente → servidor

| Evento | Payload | Ack `data` | Quem / quando | Regras |
|---|---|---|---|---|
| `time:sync` | `{ clientSentAt: number }` | `{ clientSentAt, serverNow }` | qualquer | R61 |
| `room:create` | `{ profile: PlayerProfile }` | `{ roomCode }` | fora de sala | R6, R8 |
| `room:join` | `{ roomCode, profile }` | `{ roomCode }` | fora de sala | R9, R10, R12 |
| `room:leave` | `{}` | `{}` | membro | R14, R15 |
| `room:kick` | `{ playerId }` | `{}` | anfitrião, lobby | R12 |
| `room:updateSettings` | `{ settings: MatchSettings }` | `{}` | anfitrião, lobby | R11, R18, R21 |
| `player:updateProfile` | `{ profile }` | `{}` | membro, lobby | R4 |
| `match:start` | `{}` | `{}` | anfitrião, lobby | R22–R25 |
| `match:abort` | `{}` | `{}` | anfitrião, em partida | R57 |
| `theme:draft` | `{ text }` | `{}` | participante, `theme_writing` | R28 |
| `theme:submit` | `{ text }` | `{}` | participante, `theme_writing` | R27–R29 |
| `round:ready` | `{ roundIndex }` | `{}` | participante, `round_reading` | R36, R37 |
| `panel:autosave` | `{ roundIndex, png: Uint8Array }` | `{}` | participante, `round_drawing` | R39 |
| `panel:submit` | `{ roundIndex, reason: 'done' \| 'timeout', png: Uint8Array \| null }` | `{}` | participante, `round_drawing` ou `round_closing` | R40–R44 |
| `presentation:navigate` | `{ action: 'next' \| 'prev' \| 'showFull' \| 'nextStory' } \| { action: 'goToStory', storyIndex }` | `{}` | anfitrião, `presentation` | R52, R53 |
| `presentation:end` | `{}` | `{}` | anfitrião, `presentation` | R56 |

`PlayerProfile = { nickname: string; avatar: AvatarConfig }` (R1, R2).

Erros das salas, além da validação do payload (`INVALID_PAYLOAD`) e do rate limit:

- `room:create` e `room:join` com o socket já em outra sala → `INVALID_STATE`. Repetir o `room:join` da sala em que o socket já está é idempotente e atualiza o perfil.
- `room:join`: sala inexistente → `ROOM_NOT_FOUND`; sala encerrando → `ROOM_CLOSED`; sessão expulsa → `KICKED`; sala cheia → `ROOM_FULL`, exceto para quem já é membro, que reconecta com o mesmo `playerId` (R9) e, no lobby, com o perfil enviado. Se a sessão já tinha outra conexão na sala, ela recebe `session:replaced` (R5).
- `room:leave`, `room:kick`, `room:updateSettings` e `player:updateProfile` de quem não está em sala → `NOT_IN_ROOM`; ações de anfitrião de outro membro → `NOT_HOST`; fora do lobby → `INVALID_STATE`.
- `room:kick` com o próprio `playerId` ou um jogador que não está na sala → `INVALID_PAYLOAD`.
- Durante a partida, quem entra é espectador (R10) e o `room:leave` de um participante não o remove: ele aparece desconectado e mantém a vaga (R15).

Erros da partida e da etapa de temas:

- `match:start`: de outro membro → `NOT_HOST`; fora do lobby → `INVALID_STATE`; menos de `MIN_PLAYERS` membros conectados → `NOT_ENOUGH_PLAYERS` (R22).
- `match:abort`: de outro membro → `NOT_HOST`; sem partida em andamento → `INVALID_STATE` (R57).
- `theme:draft` e `theme:submit`: fora de `theme_writing`, de espectador ou depois do envio final → `INVALID_STATE`; depois de `phaseDeadlineAt` → `DEADLINE_PASSED` (R61). O texto é normalizado (R1); no `theme:submit`, tamanho fora de `THEME_MIN_LENGTH`–`THEME_MAX_LENGTH` → `INVALID_PAYLOAD` (R27).

O servidor publica as `room:view` antes de responder o ack, então quem age recebe a view nova antes da resposta.

Validação de imagem no servidor (`apps/server/src/modules/drawing/panel-image.ts`): assinatura PNG, chunk IHDR com `PANEL_WIDTH × PANEL_HEIGHT`, tamanho `≤ PANEL_MAX_BYTES`. Falha: `IMAGE_INVALID` ou `IMAGE_TOO_LARGE`.

---

## 4. Eventos servidor → cliente

| Evento | Payload | Quando |
|---|---|---|
| `room:view` | `PlayerView` | Após cada mudança de estado relevante para o jogador, ao entrar e ao reconectar |
| `round:collect` | `{ roundIndex }` | Início de `round_closing` (R42) |
| `room:removed` | `{ reason: 'kicked' \| 'closed' }` | Expulsão (R12) ou encerramento (R16) |
| `session:replaced` | `{}` | Outra conexão da mesma sessão assumiu (R5) |

---

## 5. `PlayerView`

```ts
type PlayerView = {
  serverNow: number;                       // ms epoch do servidor no envio
  room: {
    code: string;
    status: 'lobby' | 'in_match';
    hostPlayerId: string;
    settings: MatchSettings;
    members: MemberView[];                 // ordem: joinedAt
  };
  me: { playerId: string; isHost: boolean; role: MemberRole };
  match: MatchView | null;
};

type MemberRole = 'member' | 'participant' | 'spectator';
// 'member' fora de partida; 'participant' / 'spectator' durante a partida

type MemberView = {
  playerId: string;
  nickname: string;
  avatar: AvatarConfig;
  connected: boolean;
  isHost: boolean;
  role: MemberRole;
  progress: 'idle' | 'working' | 'done';   // público: andamento na fase atual
};

type MatchPhase =
  | 'theme_writing'
  | 'round_reading'
  | 'round_drawing'
  | 'round_closing'
  | 'presentation';

type MatchView = {
  matchId: string;
  phase: MatchPhase;
  roundIndex: number;                      // -1 durante theme_writing
  totalRounds: number;
  phaseDeadlineAt: number | null;          // null na apresentação
  progress: { done: number; total: number };
  task: PlayerTask;                        // privado
  presentation: PresentationView | null;   // só em 'presentation'
};

type ArtistRef = { playerId: string; nickname: string; avatar: AvatarConfig };

type PanelRef = {
  panelId: string;
  position: number;
  artist: ArtistRef;
  status: 'complete' | 'partial' | 'empty';
};

type PlayerTask =
  | { kind: 'write_theme'; status: 'writing' | 'submitted'; draft: string }
  | { kind: 'read_story'; status: 'reading'; theme: string; previousPanels: PanelRef[] }
  | { kind: 'read_story'; status: 'ready'; theme: string }
  | { kind: 'draw_panel'; status: 'drawing' | 'submitted'; theme: string;
      panelPosition: number; hasDraft: boolean }
  | { kind: 'wait' }        // round_closing, ou nada a fazer
  | { kind: 'spectate' }    // espectadores durante a criação
  | { kind: 'watch' };      // todos durante a apresentação

type PresentationStep =
  | { kind: 'theme' }
  | { kind: 'panel'; position: number }
  | { kind: 'full' };

type PresentationView = {
  status: 'showing' | 'finished';
  storyIndex: number;
  storyCount: number;
  step: PresentationStep;
  maxStoryReached: number;
  story: {
    theme: { text: string; author: ArtistRef };
    panelCount: number;
    revealedPanels: PanelRef[];            // só os revelados (R53, R54)
  };
  reachedStories: { index: number; themeText: string; author: ArtistRef }[];
};
```

Regras de projeção (R58), testadas em `build-player-view.test.ts`:

- `read_story.previousPanels` só existe com `status: 'reading'`.
- `draw_panel` nunca inclui quadros.
- Temas de outros participantes nunca aparecem fora da apresentação.
- `presentation.story.revealedPanels` contém exatamente os quadros com posição `< revealedCount`.
- `reachedStories` lista só histórias com índice `≤ maxStoryReached`.

---

## 6. Sincronização de tempo

1. Ao conectar e a cada 60 s, o cliente envia `time:sync { clientSentAt }` três vezes.
2. Para cada resposta: `rtt = agora − clientSentAt`; `offset = serverNow + rtt/2 − agora`.
3. Usa o `offset` da amostra de menor `rtt`.
4. Tempo restante exibido: `phaseDeadlineAt − (Date.now() + offset)`, com piso 0.
5. Quando o timer local chega a 0 durante o desenho, o cliente já envia `panel:submit { reason: 'timeout' }` sem esperar o `round:collect`.

---

## 7. Fluxo típico

```text
Cliente                               Servidor
  │ POST /api/guest-sessions ───────────▶ │  cria sessão
  │ ◀──────────────────────── { token }   │
  │ connect(auth.token) ────────────────▶ │  valida sessão
  │ room:join {code, profile} ──────────▶ │  adiciona membro
  │ ◀─────────── ack {roomCode}           │
  │ ◀─────────── room:view (para todos)   │
  │ match:start (anfitrião) ────────────▶ │  plano de distribuição, fase de temas
  │ ◀─────────── room:view (task: write_theme)
  │ theme:submit ───────────────────────▶ │
  │ ◀─────────── room:view (round_drawing, task: draw_panel)
  │ panel:autosave (a cada 5 s) ────────▶ │  guarda rascunho em memória
  │ ◀─────────── round:collect            │  prazo esgotado
  │ panel:submit {reason:'timeout'} ────▶ │  janela de 3 s → persiste rodada
  │ ◀─────────── room:view (round_reading, task: read_story)
  │ GET /api/panels/:id ────────────────▶ │  PanelAccessPolicy
  │ round:ready ────────────────────────▶ │
  │ …                                     │
  │ ◀─────────── room:view (presentation)
```
