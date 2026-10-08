import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from './app';

describe('App', () => {
  it('mostra a página em construção', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Comicle — em construção' })).toBeInstanceOf(
      HTMLHeadingElement,
    );
  });
});
