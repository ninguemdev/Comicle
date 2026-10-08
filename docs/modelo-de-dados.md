# Modelo de dados

O estado vive em dois lugares, com papéis diferentes:

| Onde | O quê | Por quê |
|---|---|---|
| **Memória do servidor** | Sessões, salas, membros, presença, fase, prazos, plano de distribuição, rascunhos (autosave), cursor da apresentação | Estado vivo e de alta frequência; um processo único é a autoridade (ver [decisões D2, D3](./decisoes.md)) |
| **PostgreSQL** | Conteúdo produzido: salas (registro), partidas, temas, histórias e quadros (PNG) | Tira imagens da memória, permite servi-las por HTTP com autorização e garante limpeza por cascata |
| **Navegador** (`localStorage`) | `comicle.session` (token) e `comicle.profile` (nickname + avatar) | Retorno sem cadastro (R3, R4) |

---

## 1. Estado em memória (servidor)

Os tipos abaixo ficam em `apps/server/src/modules/*/` e não são expostos ao cliente; o cliente só recebe a `PlayerView` ([protocolo](./protocolo-realtime.md#5-playerview)).

```ts
type GuestSession = {
  guestId: string;          // uuid
  tokenHash: string;        // sha256 hex
  expiresAt: number;
};

type Room = {
  id: string;               // uuid (mesmo id da linha em `rooms`)
  code: string;
  createdAt: number;
  hostPlayerId: string;
  members: Map<string, Member>;      // por playerId
  bannedGuestIds: Set<string>;
  settings: MatchSettings;
  match: Match | null;
  emptySince: number | null;         // para R16
};

type Member = {
  playerId: string;         // uuid, estável enquanto a sala existir
  guestId: string;
  profile: PlayerProfile;
  joinedAt: number;
  connection: { socketId: string } | { disconnectedAt: number };
};

type Match = {
  id: string;
  seats: string[];                       // playerIds embaralhados (R23)
  spectators: Set<string>;
  totalRounds: number;
  drawingSeconds: number;
  plan: DistributionPlan;                // R31–R33
  phase: MatchPhase;
  phaseStartedAt: number;
  phaseDeadlineAt: number | null;
  roundIndex: number;                    // -1 na fase de temas
  stories: StoryState[];                 // índice = assento do autor
  themes: Map<string, ThemeDraftState>;  // por playerId, só na fase de temas
  round: RoundState | null;
  presentation: PresentationCursor | null;
};

type DistributionPlan = {
  // assignments[r][playerId] = índice da história na rodada r
  assignments: ReadonlyArray<Readonly<Record<string, number>>>;
};

type StoryState = {
  id: string;
  themeId: string;
  authorPlayerId: string;
  themeText: string;
  panels: PanelMeta[];                   // já persistidos, em ordem
};

type PanelMeta = {
  id: string;
  position: number;
  artistPlayerId: string;
  status: 'complete' | 'partial' | 'empty';
};

type RoundState = {
  ready: Set<string>;                    // confirmaram leitura (R36, R37)
  drafts: Map<string, Uint8Array>;       // último autosave (R39)
  finals: Map<string, { png: Uint8Array | null; reason: 'done' | 'timeout' }>;
};

type PresentationCursor = {
  status: 'showing' | 'finished';
  storyIndex: number;
  step: PresentationStep;
  maxStoryReached: number;
  revealedCount: number[];               // por história, monotônico (R53)
};
```

Invariantes verificadas em testes:

- `room.hostPlayerId` sempre aponta para um membro existente.
- Durante a partida, `match.seats` é imutável e `stories.length === seats.length`.
- `story.panels[k].position === k` e `panels.length === roundIndex` no início de cada rodada.
- `revealedCount[i]` e `maxStoryReached` nunca diminuem.

---

## 2. PostgreSQL

ORM: **Drizzle** (`apps/server/src/platform/db/schema.ts`), migrações SQL geradas por `drizzle-kit` e versionadas em `apps/server/drizzle/`.

```text
rooms ─┬─< matches ─┬─< themes ──< stories ──< panels
       │            └──────────────< stories
```

### `rooms`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `code` | `text` | Não é único no banco (códigos podem ser reutilizados após o encerramento) |
| `created_at` | `timestamptz` | default `now()` |
| `closed_at` | `timestamptz` null | preenchido ao encerrar, antes da exclusão |

### `matches`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `room_id` | `uuid` FK → `rooms.id` `ON DELETE CASCADE` | índice |
| `mode` | `text` | `'collaborative'` |
| `settings` | `jsonb` | `MatchSettings` |
| `total_rounds` | `integer` | |
| `status` | `text` | `'in_progress' \| 'presenting' \| 'finished' \| 'aborted'` |
| `started_at` | `timestamptz` | |
| `finished_at` | `timestamptz` null | |

### `themes`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `match_id` | `uuid` FK → `matches.id` `ON DELETE CASCADE` | |
| `author_player_id` | `uuid` | |
| `author_nickname` | `text` | cópia no momento da partida |
| `text` | `text` | |
| `source` | `text` | `'player' \| 'fallback'` |
| `seat` | `integer` | |

### `stories`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `match_id` | `uuid` FK → `matches.id` `ON DELETE CASCADE` | |
| `theme_id` | `uuid` FK → `themes.id` `ON DELETE CASCADE` | No modo 2, um tema terá várias histórias |
| `position` | `integer` | ordem de apresentação |

### `panels`

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | `uuid` PK | |
| `story_id` | `uuid` FK → `stories.id` `ON DELETE CASCADE` | |
| `position` | `integer` | `UNIQUE (story_id, position)` |
| `artist_player_id` | `uuid` | |
| `artist_nickname` | `text` | |
| `status` | `text` | `'complete' \| 'partial' \| 'empty'` |
| `image` | `bytea` null | PNG; null quando `empty` |
| `byte_size` | `integer` | |
| `created_at` | `timestamptz` | |

### Repositórios

Interfaces em `apps/server/src/modules/stories/story-repository.ts`, com duas implementações: `DrizzleStoryRepository` (`drizzle-story.repository.ts` — o sufixo `.repository` libera o Drizzle na regra de domínio puro; produção e testes `*.db.test.ts`) e `InMemoryStoryRepository` (`in-memory-story-repository.ts`; testes unitários e de integração do realtime). As duas passam pela mesma suíte de contrato (`story-repository.contract.ts`).

```ts
interface StoryRepository {
  createRoom(room: { id: string; code: string }): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;                     // cascata
  createMatch(input: NewMatch): Promise<void>;                   // match + themes + stories
  saveRoundPanels(matchId: string, panels: NewPanel[]): Promise<void>; // uma transação
  getPanelImage(panelId: string): Promise<{ png: Uint8Array } | null>;
  setMatchStatus(matchId: string, status: MatchStatus): Promise<void>;
  deleteMatch(matchId: string): Promise<void>;
  deleteAllOpenRooms(): Promise<number>;                         // boot (R17)
}
```

- `NewMatch = { id, roomId, settings, totalRounds, startedAt, themes: NewTheme[], stories: NewStory[] }`, com `NewTheme` e `NewStory` espelhando as colunas de `themes` e `stories`. A partida nasce com `status = 'in_progress'`.
- `NewPanel = { id, storyId, position, artistPlayerId, artistNickname, status, png }`; `png` é `null` exatamente quando `status = 'empty'`.
- `saveRoundPanels` confere que as histórias pertencem à partida e grava a rodada num único `INSERT` de várias linhas: atômico, sem transação explícita. Posição repetida ou já ocupada faz nada ser gravado.
- Escrita inválida (referência quebrada, posição repetida, imagem incoerente com o status) lança `StoryRepositoryError`; os serviços tratam isso como falha de persistência (R57).
- `setMatchStatus` preenche `finished_at` com o horário do banco ao entrar em `finished` ou `aborted`.

---

## 3. Retenção

| Evento | O que é apagado |
|---|---|
| Nova partida na mesma sala (R25) | Partida anterior (cascata) |
| `match:abort` (R57) | A partida abortada |
| Encerramento da sala (R16) | Linha de `rooms` (cascata em tudo) e estado em memória |
| Boot do servidor (R17) | Todas as salas sem `closed_at` |

Não existe biblioteca permanente de histórias. Logs nunca contêm temas, imagens ou tokens.
