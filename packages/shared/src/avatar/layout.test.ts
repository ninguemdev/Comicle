import { describe, expect, it } from 'vitest';

import { avatarConfigSchema } from '../schemas/profile';
import { defaultAvatar, sanitizeAvatar } from './catalog';
import { avatarLayerRect, avatarTransform, sanitizeAvatarLayout } from './layout';

const adjusted = {
  ...defaultAvatar(),
  hair: 'hair-tousled',
  layout: { version: 1 as const, parts: { eyes: { x: 0.25, y: -0.1, scale: 1.5 } } },
};

describe('layout do avatar', () => {
  it('R2: aceita perfis antigos e um layout versionado', () => {
    const old = { ...defaultAvatar() };
    delete old.hair;
    expect(avatarConfigSchema.safeParse(old).success).toBe(true);
    expect(avatarConfigSchema.safeParse(adjusted).success).toBe(true);
  });

  it('R2: rejeita versão, peças, limites e transformação da cabeça inválidos na rede', () => {
    const layout = adjusted.layout;
    for (const candidate of [
      { ...layout, version: 2 },
      { ...layout, parts: { head: { x: 0, y: 0, scale: 1 } } },
      { ...layout, parts: { eyes: { x: 0.36, y: 0, scale: 1 } } },
      { ...layout, parts: { eyes: { x: 0, y: -0.36, scale: 1 } } },
      { ...layout, parts: { eyes: { x: 0, y: 0, scale: 2.01 } } },
      { ...layout, parts: { eyes: { x: 0, y: 0, scale: 0.49 } } },
      { ...layout, parts: { eyes: { x: Number.NaN, y: 0, scale: 1 } } },
      { ...layout, parts: { eyes: { x: Number.POSITIVE_INFINITY, y: 0, scale: 1 } } },
      { ...layout, parts: { eyes: { x: 0, y: 0, scale: 1, rotation: 20 } } },
    ]) {
      expect(avatarConfigSchema.safeParse({ ...adjusted, layout: candidate }).success).toBe(false);
    }
    expect(avatarConfigSchema.safeParse({ ...adjusted, headTransform: {} }).success).toBe(false);
  });

  it('R2: recupera ajustes válidos individualmente e conserva a cabeça antiga', () => {
    expect(
      sanitizeAvatar({
        ...adjusted,
        head: 'head-square',
        layout: {
          version: 1,
          parts: {
            eyes: { x: 0.2, y: 0, scale: 1.2 },
            mouth: { x: 9, y: 0, scale: 1 },
            head: { x: 0.3, y: 0, scale: 2 },
          },
        },
      }),
    ).toMatchObject({
      head: 'head-square',
      hair: 'hair-tousled',
      layout: { version: 1, parts: { eyes: { x: 0.2, y: 0, scale: 1.2 } } },
    });
    expect(sanitizeAvatarLayout({ version: 2, parts: {} })).toBeUndefined();
  });

  it('mantém o centro dos pixels visíveis como pivô e a cabeça sem transformação', () => {
    expect(avatarLayerRect({ x: 0.1, y: -0.1, scale: 1.5 }, { x: 0.4, y: 0.3 })).toEqual({
      x: -0.1,
      y: -0.25,
      width: 1.5,
      height: 1.5,
    });
    expect(avatarTransform(adjusted, 'head')).toEqual({ x: 0, y: 0, scale: 1 });
    expect(avatarTransform(adjusted, 'eyes')).toEqual(adjusted.layout.parts.eyes);
  });
});
