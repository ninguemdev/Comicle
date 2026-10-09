import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorBoundary } from './error-boundary';

function Boom(): never {
  throw new Error('quebrou');
}

beforeEach(() => {
  // React reports every caught render error on the console.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('mostra os filhos enquanto nada quebra', () => {
    render(
      <ErrorBoundary fallback={<p>Algo deu errado</p>}>
        <p>Tudo certo</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Tudo certo')).toBeInstanceOf(HTMLParagraphElement);
    expect(screen.queryByText('Algo deu errado')).toBeNull();
  });

  it('troca os filhos pela tela amigável quando um deles quebra ao renderizar', () => {
    render(
      <ErrorBoundary fallback={<p>Algo deu errado</p>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Algo deu errado')).toBeInstanceOf(HTMLParagraphElement);
  });
});
