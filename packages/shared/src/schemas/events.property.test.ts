import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { clientEventSchemas, type ClientEventName } from '../events';

// T19: no input, however odd, makes a schema throw; it parses or reports `success: false`.

/** Every key a client payload uses, so random objects get close to the real shapes. */
const PAYLOAD_KEYS = [
  'clientSentAt',
  'profile',
  'nickname',
  'avatar',
  'head',
  'eyes',
  'mouth',
  'cheeks',
  'hat',
  'faceAccessory',
  'roomCode',
  'playerId',
  'settings',
  'mode',
  'panelCount',
  'kind',
  'value',
  'drawingSeconds',
  'text',
  'roundIndex',
  'png',
  'reason',
  'action',
  'storyIndex',
  '__proto__',
  'constructor',
] as const;

const leaf = fc.oneof(
  fc.anything(),
  fc.string({ unit: 'binary', maxLength: 300 }),
  fc.uint8Array({ maxLength: 64 }),
  fc.constantFrom(
    null,
    undefined,
    NaN,
    Infinity,
    -1,
    2 ** 53,
    '',
    'K7PQ2M',
    'next',
    'goToStory',
    'done',
    'collaborative',
    'per_player',
    'fixed',
  ),
);

/** Objects shaped like payloads, nested a few levels, with random values. */
const payloadLike: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  node: fc.oneof(
    { depthSize: 'small' },
    leaf,
    fc.dictionary(fc.constantFrom(...PAYLOAD_KEYS), tie('node'), { maxKeys: 6 }),
    fc.array(tie('node'), { maxLength: 4 }),
  ),
})).node;

const events = Object.keys(clientEventSchemas) as ClientEventName[];

describe('schemas dos eventos (propriedade)', () => {
  it.each(events)('%s: nenhuma entrada faz o schema lançar exceção', (event) => {
    const schema = clientEventSchemas[event];
    fc.assert(
      fc.property(payloadLike, (payload) => {
        const result = schema.safeParse(payload);
        expect(typeof result.success).toBe('boolean');
      }),
      { numRuns: 300 },
    );
  });
});
