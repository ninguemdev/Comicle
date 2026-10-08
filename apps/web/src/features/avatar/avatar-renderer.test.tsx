import { defaultAvatar, type AvatarConfig } from '@comicle/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AvatarRenderer } from './avatar-renderer';

const FULL: AvatarConfig = {
  head: 'head-square',
  eyes: 'eyes-wide',
  mouth: 'mouth-open',
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
      '/avatars/head/head-square.svg',
      '/avatars/cheeks/cheeks-blush.svg',
      '/avatars/eyes/eyes-wide.svg',
      '/avatars/mouth/mouth-open.svg',
      '/avatars/face-accessory/face-accessory-glasses.svg',
      '/avatars/hat/hat-cap.svg',
    ]);
  });

  it('R2: opcionais em null e IDs desconhecidos não desenham camada', () => {
    const { container } = render(
      <AvatarRenderer avatar={{ ...defaultAvatar(), eyes: 'eyes-aposentados' }} size={32} />,
    );

    expect(layerSources(container)).toEqual([
      '/avatars/head/head-round.svg',
      '/avatars/mouth/mouth-smile.svg',
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
});
