// Payload schemas of each client → server event (docs/protocolo-realtime.md §3).

import { z } from 'zod';

import { matchSettingsSchema } from './match-settings';
import { playerProfileSchema } from './profile';
import { roomCodeSchema } from './room-code';
import { themeDraftSchema, themeSchema } from './text';

const emptyPayloadSchema = z.object({});

const roundIndexSchema = z.int().nonnegative();

/** PNG bytes; Node's `Buffer` passes too. Content is checked on the server (panel-image.ts). */
const pngSchema = z.custom<Uint8Array>((value) => value instanceof Uint8Array, 'PNG inválido.');

export const timeSyncPayloadSchema = z.object({ clientSentAt: z.number() });

export const roomCreatePayloadSchema = z.object({ profile: playerProfileSchema });

export const roomJoinPayloadSchema = z.object({
  roomCode: roomCodeSchema,
  profile: playerProfileSchema,
});

export const roomLeavePayloadSchema = emptyPayloadSchema;

export const roomKickPayloadSchema = z.object({ playerId: z.string().min(1) });

export const roomUpdateSettingsPayloadSchema = z.object({ settings: matchSettingsSchema });

export const playerUpdateProfilePayloadSchema = z.object({ profile: playerProfileSchema });

export const matchStartPayloadSchema = emptyPayloadSchema;

export const matchAbortPayloadSchema = emptyPayloadSchema;

export const themeDraftPayloadSchema = z.object({ text: themeDraftSchema });

export const themeSubmitPayloadSchema = z.object({ text: themeSchema });

export const roundReadyPayloadSchema = z.object({ roundIndex: roundIndexSchema });

export const panelAutosavePayloadSchema = z.object({
  roundIndex: roundIndexSchema,
  png: pngSchema,
});

export const panelSubmitPayloadSchema = z.object({
  roundIndex: roundIndexSchema,
  reason: z.enum(['done', 'timeout']),
  png: pngSchema.nullable(),
});

export const presentationNavigatePayloadSchema = z.union([
  z.object({ action: z.enum(['next', 'prev', 'showFull', 'nextStory']) }),
  z.object({ action: z.literal('goToStory'), storyIndex: z.int().nonnegative() }),
]);

export const presentationEndPayloadSchema = emptyPayloadSchema;
