import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { soundEngine } from '../features/sound/sound-engine';
import { Button } from './button';
import { Toast } from './toast';

// docs/sons.md §2: a press answers with a click; a refused action with the error sound.

afterEach(() => {
  vi.restoreAllMocks();
});

function spyOnSounds() {
  return vi.spyOn(soundEngine, 'play').mockImplementation(() => undefined);
}

describe('sons da interface', () => {
  it('o botão toca o clique e ainda faz a sua ação; desabilitado, nada', () => {
    const play = spyOnSounds();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Pronto</Button>);

    fireEvent.click(screen.getByRole('button', { name: 'Pronto' }));
    expect(play).toHaveBeenCalledWith('click');
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Pronto
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pronto' }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('o aviso de erro toca o som de erro; os outros avisos, não', () => {
    const play = spyOnSounds();
    const { rerender } = render(<Toast message="Tudo certo" tone="success" onDismiss={vi.fn()} />);
    expect(play).not.toHaveBeenCalled();

    rerender(<Toast message="Sala cheia" tone="error" onDismiss={vi.fn()} />);
    expect(play).toHaveBeenCalledWith('error');
  });
});
