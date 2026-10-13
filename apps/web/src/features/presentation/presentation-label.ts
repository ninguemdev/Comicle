import type { PresentationView } from '@comicle/shared';

import { strings } from '../../strings/pt-BR';

const texts = strings.match.presentation;

/**
 * Where the presentation is: "História 2 de 5", or "Tema 1 de 3 · versão 2 de 2" in the
 * individual mode (R68).
 */
export function presentationPosition(presentation: PresentationView): string {
  const { version } = presentation;
  return version === null
    ? texts.storyOf(presentation.storyIndex + 1, presentation.storyCount)
    : texts.versionOf(version.themeIndex + 1, version.themeCount, version.index + 1, version.count);
}
