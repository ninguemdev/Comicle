import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConnectionBanner } from './connection-banner';

const height = () => document.documentElement.style.getPropertyValue('--connection-banner-height');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConnectionBanner', () => {
  it('publica a própria altura enquanto aparece e zera ao sumir', () => {
    // jsdom has no layout: the strip "measures" 40px.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40);
    const { rerender } = render(<ConnectionBanner status="reconnecting" />);
    expect(height()).toBe('40px');

    rerender(<ConnectionBanner status={null} />);
    expect(height()).toBe('0px');
  });

  it('anuncia "Reconectando…" sem trocar o resto da tela', () => {
    const { getByRole } = render(<ConnectionBanner status="reconnecting" />);
    expect(getByRole('status').textContent).toBe('Reconectando…');
  });
});
