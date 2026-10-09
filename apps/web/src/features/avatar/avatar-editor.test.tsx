import { defaultAvatar, randomAvatar, type AvatarConfig, type Rng } from '@comicle/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AvatarEditor } from './avatar-editor';

const lastOptionRng: Rng = { nextInt: (maxExclusive) => maxExclusive - 1 };

function Harness({
  initial = defaultAvatar(),
  onChange,
}: {
  initial?: AvatarConfig;
  onChange: (avatar: AvatarConfig) => void;
}) {
  const [avatar, setAvatar] = useState(initial);
  return (
    <AvatarEditor
      value={avatar}
      onChange={(next) => {
        setAvatar(next);
        onChange(next);
      }}
      rng={lastOptionRng}
    />
  );
}

function previewLayers(): (string | null)[] {
  const preview = screen.getByRole('img', { name: 'Prévia do seu avatar' });
  return Array.from(preview.querySelectorAll('img'), (image) => image.getAttribute('src'));
}

describe('AvatarEditor', () => {
  it('clicar numa opção atualiza a prévia e o estado', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Olhos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Arregalados' }));

    expect(onChange).toHaveBeenLastCalledWith({ ...defaultAvatar(), eyes: 'eyes-wide' });
    expect(previewLayers()).toContain('/avatars/eyes/eyes-wide.png');
    expect(previewLayers()).not.toContain('/avatars/eyes/eyes-dots.png');
    expect(screen.getByRole('button', { name: 'Arregalados' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('R2: "nenhum" grava null e tira a camada da prévia', () => {
    const onChange = vi.fn();
    render(<Harness initial={{ ...defaultAvatar(), hat: 'hat-cap' }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Chapéu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nenhum' }));

    expect(onChange).toHaveBeenLastCalledWith({ ...defaultAvatar(), hat: null });
    expect(previewLayers()).not.toContain('/avatars/hat/hat-cap.png');
  });

  it('R2: categorias obrigatórias não oferecem "nenhum"', () => {
    render(<Harness onChange={vi.fn()} />);

    for (const tab of ['Cabeça', 'Olhos', 'Boca']) {
      fireEvent.click(screen.getByRole('tab', { name: tab }));
      expect(screen.queryByRole('button', { name: 'Nenhum' }), tab).toBeNull();
    }
  });

  it('R4: Aleatório sorteia um avatar novo com o Rng recebido', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Aleatório' }));

    expect(onChange).toHaveBeenLastCalledWith(randomAvatar(lastOptionRng));
  });

  it('abas navegam por teclado e só a aba ativa entra no Tab', () => {
    render(<Harness onChange={vi.fn()} />);
    const head = screen.getByRole('tab', { name: 'Cabeça' });
    head.focus();

    fireEvent.keyDown(head, { key: 'ArrowRight' });
    const eyes = screen.getByRole('tab', { name: 'Olhos' });
    expect(eyes.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(eyes);
    expect(head.getAttribute('tabindex')).toBe('-1');

    fireEvent.keyDown(eyes, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Chapéu' }));

    fireEvent.keyDown(document.activeElement ?? eyes, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(head);
    expect(screen.getByRole('tabpanel', { name: 'Cabeça' })).toBeInstanceOf(HTMLDivElement);
  });

  it('opções são botões focáveis (Enter e Espaço selecionam)', () => {
    render(<Harness onChange={vi.fn()} />);

    const options = screen.getAllByRole('button', { pressed: false });

    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.tagName).toBe('BUTTON');
      expect(option.tabIndex).toBe(0);
    }
  });
});
