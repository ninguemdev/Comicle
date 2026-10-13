import '@fontsource/bangers';
import '@fontsource-variable/nunito';
import './styles/theme.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import { ErrorPage } from './features/errors/error-page';
import { soundEngine, unlockOnGestures } from './features/sound/sound-engine';
// Applies the saved light or dark choice before the first render.
import './stores/theme-store';
// Hands the saved volume to the sound engine before anything can play (docs/sons.md §4).
import './stores/sound-store';
import { ErrorBoundary } from './ui/error-boundary';

// Browsers only allow audio after a user gesture (docs/sons.md §5).
unlockOnGestures(soundEngine, window);

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
