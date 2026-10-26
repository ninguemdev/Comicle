import { defaultAvatar, type AvatarConfig } from '@comicle/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AvatarRenderer } from './avatar-renderer';

const FULL: AvatarConfig = {
  head: 'head-square',
  eyes: 'eyes-wide',
  mouth: 'mouth-sad',
  cheeks: 'cheeks-blush',
  hat: 'hat-cap',
  faceAccessory: 'face-accessory-glasses',
};

function layerSources(container: HTMLElement): (string | null)[] {
  return Array.from(container.querySelectorAll('img'), (image) => image.getAttribute('src'));
}

describe('AvatarRenderer', () => {
  it('empilha as camadas na ordem de desenho, de baixo para cima', () => {
    const { container } = render(<AvatarRenderer avatar={FULL} size={64} />);

    expect(layerSources(container)).toEqual([
      '/avatars/head/head-square.png',
      '/avatars/cheeks/cheeks-blush.png',
      '/avatars/eyes/eyes-wide.png',
      '/avatars/mouth/mouth-sad.png',
      '/avatars/face-accessory/face-accessory-glasses.png',
      '/avatars/hat/hat-cap.png',
    ]);
  });

  it('R2: opcionais em null e IDs desconhecidos não desenham camada', () => {
    const { container } = render(
      <AvatarRenderer avatar={{ ...defaultAvatar(), eyes: 'eyes-aposentados' }} size={32} />,
    );

    expect(layerSources(container)).toEqual([
      '/avatars/head/head-round.png',
      '/avatars/mouth/mouth-smile.png',
    ]);
  });

  it('com rótulo é uma imagem acessível; sem rótulo é decorativo', () => {
    const { container } = render(
      <>
        <AvatarRenderer avatar={FULL} size={160} label="Avatar de Ana" />
        <AvatarRenderer avatar={FULL} size={32} />
      </>,
    );

    expect(screen.getAllByRole('img')).toEqual([
      screen.getByRole('img', { name: 'Avatar de Ana' }),
    ]);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1);
    for (const layer of container.querySelectorAll('img')) {
      expect(layer.getAttribute('alt')).toBe('');
    }
  });

  it('usa o tamanho pedido', () => {
    const { container } = render(<AvatarRenderer avatar={FULL} size={256} />);

    expect(container.querySelector('img')?.getAttribute('width')).toBe('256');
  });

  it('aplica a mesma geometria em prévias e miniaturas e recorta as camadas', () => {
    const avatar: AvatarConfig = {
      ...FULL,
      hair: 'hair-tousled',
      layout: { version: 1, parts: { eyes: { x: 0.1, y: -0.1, scale: 1.5 } } },
    };
    const { container, rerender } = render(<AvatarRenderer avatar={avatar} size={256} />);
    const frame = container.querySelector('span');
    const eyes = container.querySelector<HTMLImageElement>('[data-avatar-part="eyes"]');
    expect(frame?.className).toContain('overflow-hidden');
    expect(eyes?.style.width).toBe('150%');
    expect(
      container.querySelector<HTMLImageElement>('[data-avatar-part="head"]')?.style.width,
    ).toBe('100%');
    expect(Array.from(container.querySelectorAll('img')).at(-2)?.dataset.avatarPart).toBe('hair');
    const style = eyes?.getAttribute('style');
    rerender(<AvatarRenderer avatar={avatar} size={32} />);
    expect(container.querySelector('[data-avatar-part="eyes"]')?.getAttribute('style')).toBe(style);
  });
});
