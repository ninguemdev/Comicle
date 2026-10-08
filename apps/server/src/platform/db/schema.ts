// Tables from docs/modelo-de-dados.md §2. IDs are generated in code (newId), not by the database.

import type { MatchSettings, PanelStatus } from '@comicle/shared';
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import type { MatchStatus, ThemeSource } from '../../modules/stories/story-repository';

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => 'bytea',
  toDriver: (value) => Buffer.from(value.buffer, value.byteOffset, value.byteLength),
  fromDriver: (value) => new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
});

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey(),
  code: text('code').notNull(),
  createdAt: createdAt(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

export const matches = pgTable(
  'matches',
  {
    id: uuid('id').primaryKey(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    mode: text('mode').$type<MatchSettings['mode']>().notNull(),
    settings: jsonb('settings').$type<MatchSettings>().notNull(),
    totalRounds: integer('total_rounds').notNull(),
    status: text('status').$type<MatchStatus>().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => [index('matches_room_id_idx').on(table.roomId)],
);

export const themes = pgTable(
  'themes',
  {
    id: uuid('id').primaryKey(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    authorPlayerId: uuid('author_player_id').notNull(),
    authorNickname: text('author_nickname').notNull(),
    text: text('text').notNull(),
    source: text('source').$type<ThemeSource>().notNull(),
    seat: integer('seat').notNull(),
  },
  (table) => [index('themes_match_id_idx').on(table.matchId)],
);

export const stories = pgTable(
  'stories',
  {
    id: uuid('id').primaryKey(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    themeId: uuid('theme_id')
      .notNull()
      .references(() => themes.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (table) => [
    index('stories_match_id_idx').on(table.matchId),
    index('stories_theme_id_idx').on(table.themeId),
  ],
);

export const panels = pgTable(
  'panels',
  {
    id: uuid('id').primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    artistPlayerId: uuid('artist_player_id').notNull(),
    artistNickname: text('artist_nickname').notNull(),
    status: text('status').$type<PanelStatus>().notNull(),
    image: bytea('image'),
    byteSize: integer('byte_size').notNull(),
    createdAt: createdAt(),
  },
  // The unique constraint's index also serves the story_id foreign key.
  (table) => [unique('panels_story_id_position_unique').on(table.storyId, table.position)],
);
