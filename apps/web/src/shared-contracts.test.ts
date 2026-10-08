import { describe, expect, it } from 'vitest';

import { defaultAvatar, isValidAvatar, roomCodeSchema } from '@comicle/shared';

describe('@comicle/shared no cliente', () => {
  it('importa schemas e o catálogo de avatares', () => {
    expect(roomCodeSchema.parse('k7pq2m')).toBe('K7PQ2M');
    expect(isValidAvatar(defaultAvatar())).toBe(true);
  });
});
