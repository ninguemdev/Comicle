import fc from 'fast-check';

// Random client payloads for robustness tests (T19): shaped like the real ones, with odd values.

const PAYLOAD_KEYS = [
  'clientSentAt',
  'profile',
  'nickname',
  'avatar',
  'head',
  'eyes',
  'mouth',
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
  // Only what Socket.IO can send: no BigInt, functions or symbols.
  fc.jsonValue({ maxDepth: 2 }),
  fc.string({ unit: 'binary', maxLength: 300 }),
  fc.uint8Array({ maxLength: 64 }),
  fc.constantFrom(-1, 2 ** 53, '', 'K7PQ2M', 'next', 'goToStory', 'done', 'fixed', 'head-round'),
);

export const payloadLike: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  node: fc.oneof(
    { depthSize: 'small' },
    leaf,
    fc.dictionary(fc.constantFrom(...PAYLOAD_KEYS), tie('node'), { maxKeys: 6 }),
    fc.array(tie('node'), { maxLength: 4 }),
  ),
})).node;

/** Socket.IO's parser closes a connection whose packet has more binary attachments than this. */
export const SOCKET_IO_MAX_ATTACHMENTS = 10;

/** Binary attachments Socket.IO would send for `value`. */
export function countAttachments(value: unknown): number {
  if (value instanceof Uint8Array) {
    return 1;
  }
  if (value === null || typeof value !== 'object') {
    return 0;
  }
  return Object.values(value).reduce<number>((sum, child) => sum + countAttachments(child), 0);
}
