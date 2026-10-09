import type { PresentationStep } from '@comicle/shared';

// Presentation cursor (docs/modelo-de-dados.md §1). Pure; navigation arrives with T16.

export interface PresentationCursor {
  readonly status: 'showing' | 'finished';
  readonly storyIndex: number;
  readonly step: PresentationStep;
  /** Only grows (R53). */
  readonly maxStoryReached: number;
  /** Panels revealed per story; each entry only grows (R53). */
  readonly revealedCount: readonly number[];
}

/** R51: first story, showing its theme, nothing revealed yet. */
export function initialPresentationCursor(storyCount: number): PresentationCursor {
  return {
    status: 'showing',
    storyIndex: 0,
    step: { kind: 'theme' },
    maxStoryReached: 0,
    revealedCount: Array.from({ length: storyCount }, () => 0),
  };
}
