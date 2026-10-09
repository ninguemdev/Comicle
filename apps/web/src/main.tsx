import '@fontsource/bangers';
import '@fontsource-variable/nunito';
import './styles/theme.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { ErrorPage } from './features/errors/error-page';
// Applies the saved light or dark choice before the first render.
import './stores/theme-store';
import { ErrorBoundary } from './ui/error-boundary';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento #root não encontrado em index.html');
}

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary fallback={<ErrorPage />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
