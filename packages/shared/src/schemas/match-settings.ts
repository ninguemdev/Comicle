import { z } from 'zod';

import {
  DRAWING_SECONDS_OPTIONS,
  FIXED_PANEL_COUNT_MAX,
  FIXED_PANEL_COUNT_MIN,
  INDIVIDUAL_PANEL_COUNT_MAX,
  INDIVIDUAL_PANEL_COUNT_MIN,
  STORY_SECONDS_OPTIONS,
} from '../constants';
import type { MatchSettings } from '../domain/match-settings';

const panelCountSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('per_player') }),
  z.object({
    kind: z.literal('fixed'),
    value: z.int().min(FIXED_PANEL_COUNT_MIN).max(FIXED_PANEL_COUNT_MAX),
  }),
]);

const individualSettingsSchema = z.object({
  panelsPerStory: z.int().min(INDIVIDUAL_PANEL_COUNT_MIN).max(INDIVIDUAL_PANEL_COUNT_MAX),
  storySeconds: z.literal(STORY_SECONDS_OPTIONS),
});

/** R18, R21. */
export const matchSettingsSchema = z.object({
  mode: z.enum(['collaborative', 'individual'], 'Modo de jogo indisponível.'),
  panelCount: panelCountSchema,
  drawingSeconds: z.literal(DRAWING_SECONDS_OPTIONS),
  showPreviousPanels: z.boolean(),
  authorDrawsLast: z.boolean(),
  individual: individualSettingsSchema,
}) satisfies z.ZodType<MatchSettings>;
