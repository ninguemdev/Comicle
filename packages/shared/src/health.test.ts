import { describe, expect, it } from 'vitest';

import { HEALTH_OK } from './index';

describe('@hq/shared', () => {
  it('exporta o corpo da resposta de saúde', () => {
    expect(HEALTH_OK).toEqual({ status: 'ok' });
  });
});
