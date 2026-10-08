import { z } from 'zod';

import {
  DRAWING_SECONDS_OPTIONS,
  FIXED_PANEL_COUNT_MAX,
  FIXED_PANEL_COUNT_MIN,
} from '../constants';
import type { MatchSettings } from '../domain/match-settings';

const panelCountSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('per_player') }),
  z.object({
    kind: z.literal('fixed'),
    value: z.int().min(FIXED_PANEL_COUNT_MIN).max(FIXED_PANEL_COUNT_MAX),
  }),
]);

/** R18; v1 accepts only the collaborative mode (R21). */
export const matchSettingsSchema = z.object({
  mode: z.literal('collaborative', 'Modo de jogo indisponível.'),
  panelCount: panelCountSchema,
  drawingSeconds: z.literal(DRAWING_SECONDS_OPTIONS),
}) satisfies z.ZodType<MatchSettings>;
