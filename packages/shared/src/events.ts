// Typed Socket.IO events (docs/protocolo-realtime.md §3 and §4).

import type { z } from 'zod';

import type { Ack, Empty } from './domain/ack';
import type { PlayerView } from './domain/player-view';
import {
  matchAbortPayloadSchema,
  matchStartPayloadSchema,
  panelAutosavePayloadSchema,
  panelSubmitPayloadSchema,
  playerUpdateProfilePayloadSchema,
  presentationEndPayloadSchema,
  presentationNavigatePayloadSchema,
  roomCreatePayloadSchema,
  roomJoinPayloadSchema,
  roomKickPayloadSchema,
  roomLeavePayloadSchema,
  roomUpdateSettingsPayloadSchema,
  roundReadyPayloadSchema,
  themeDraftPayloadSchema,
  themeSubmitPayloadSchema,
  timeSyncPayloadSchema,
} from './schemas/events';

/** Payload schema of every client → server event; handlers validate with it. */
export const clientEventSchemas = {
  'time:sync': timeSyncPayloadSchema,
  'room:create': roomCreatePayloadSchema,
  'room:join': roomJoinPayloadSchema,
  'room:leave': roomLeavePayloadSchema,
  'room:kick': roomKickPayloadSchema,
  'room:updateSettings': roomUpdateSettingsPayloadSchema,
  'player:updateProfile': playerUpdateProfilePayloadSchema,
  'match:start': matchStartPayloadSchema,
  'match:abort': matchAbortPayloadSchema,
  'theme:draft': themeDraftPayloadSchema,
  'theme:submit': themeSubmitPayloadSchema,
  'round:ready': roundReadyPayloadSchema,
  'panel:autosave': panelAutosavePayloadSchema,
  'panel:submit': panelSubmitPayloadSchema,
  'presentation:navigate': presentationNavigatePayloadSchema,
  'presentation:end': presentationEndPayloadSchema,
} as const;

export type ClientEventName = keyof typeof clientEventSchemas;

/** What the client sends (before normalization). */
export type ClientEventPayload<E extends ClientEventName> = z.input<(typeof clientEventSchemas)[E]>;

/** What the handler receives after validation and normalization. */
export type ParsedClientEventPayload<E extends ClientEventName> = z.output<
  (typeof clientEventSchemas)[E]
>;

/** `data` of the successful ack of each event. */
export interface ClientEventAckData {
  'time:sync': { clientSentAt: number; serverNow: number };
  'room:create': { roomCode: string };
  'room:join': { roomCode: string };
  'room:leave': Empty;
  'room:kick': Empty;
  'room:updateSettings': Empty;
  'player:updateProfile': Empty;
  'match:start': Empty;
  'match:abort': Empty;
  'theme:draft': Empty;
  'theme:submit': Empty;
  'round:ready': Empty;
  'panel:autosave': Empty;
  'panel:submit': Empty;
  'presentation:navigate': Empty;
  'presentation:end': Empty;
}

export type ClientToServerEvents = {
  [E in ClientEventName]: (
    payload: ClientEventPayload<E>,
    ack: (response: Ack<ClientEventAckData[E]>) => void,
  ) => void;
};

export type RoomRemovedReason = 'kicked' | 'closed';

export interface ServerToClientEvents {
  'room:view': (view: PlayerView) => void;
  'round:collect': (payload: { roundIndex: number }) => void;
  'room:removed': (payload: { reason: RoomRemovedReason }) => void;
  'session:replaced': (payload: Empty) => void;
}
