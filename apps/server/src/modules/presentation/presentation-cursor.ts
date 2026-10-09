import type { ParsedClientEventPayload, PresentationStep } from '@comicle/shared';

import { DomainError } from '../../platform/errors';

// Presentation cursor (docs/modelo-de-dados.md §1, R50–R54). Pure.

export interface PresentationCursor {
  readonly status: 'showing' | 'finished';
  readonly storyIndex: number;
  readonly step: PresentationStep;
  /** Only grows (R53). */
  readonly maxStoryReached: number;
  /** Panels revealed per story; each entry only grows (R53). */
  readonly revealedCount: readonly number[];
}

export type PresentationAction = ParsedClientEventPayload<'presentation:navigate'>;

const THEME: PresentationStep = { kind: 'theme' };
const FULL: PresentationStep = { kind: 'full' };

function panelStep(position: number): PresentationStep {
  return { kind: 'panel', position };
}

/** R51: first story, showing its theme, nothing revealed yet. */
export function initialPresentationCursor(storyCount: number): PresentationCursor {
  return {
    status: 'showing',
    storyIndex: 0,
    step: THEME,
    maxStoryReached: 0,
    revealedCount: Array.from({ length: storyCount }, () => 0),
  };
}

/** R53: how many panels of the story `step` reveals, at least. */
function revealedBy(step: PresentationStep, panelCount: number): number {
  switch (step.kind) {
    case 'theme':
      return 0;
    case 'panel':
      return step.position + 1;
    case 'full':
      return panelCount;
    default:
      return step satisfies never;
  }
}

/** Shows `step` of story `storyIndex`; what it reveals is added, nothing is ever hidden (R53). */
function showStep(
  cursor: PresentationCursor,
  storyIndex: number,
  step: PresentationStep,
  panelCounts: readonly number[],
): PresentationCursor {
  const panelCount = panelCounts[storyIndex] ?? 0;
  return {
    status: 'showing',
    storyIndex,
    step,
    maxStoryReached: Math.max(cursor.maxStoryReached, storyIndex),
    revealedCount: cursor.revealedCount.map((count, index) =>
      index === storyIndex ? Math.max(count, revealedBy(step, panelCount)) : count,
    ),
  };
}

function next(cursor: PresentationCursor, panelCounts: readonly number[]): PresentationCursor {
  const { storyIndex, step } = cursor;
  const lastPanel = (panelCounts[storyIndex] ?? 0) - 1;
  switch (step.kind) {
    case 'theme':
      return showStep(cursor, storyIndex, lastPanel >= 0 ? panelStep(0) : FULL, panelCounts);
    case 'panel':
      return showStep(
        cursor,
        storyIndex,
        step.position < lastPanel ? panelStep(step.position + 1) : FULL,
        panelCounts,
      );
    case 'full':
      return storyIndex < panelCounts.length - 1
        ? showStep(cursor, storyIndex + 1, THEME, panelCounts)
        : { ...cursor, status: 'finished' };
    default:
      return step satisfies never;
  }
}

function prev(cursor: PresentationCursor, panelCounts: readonly number[]): PresentationCursor {
  const { storyIndex, step } = cursor;
  const lastPanel = (panelCounts[storyIndex] ?? 0) - 1;
  switch (step.kind) {
    case 'theme':
      // D29: before the first theme there is nothing; the cursor stays.
      return storyIndex > 0 ? showStep(cursor, storyIndex - 1, FULL, panelCounts) : cursor;
    case 'panel':
      return showStep(
        cursor,
        storyIndex,
        step.position > 0 ? panelStep(step.position - 1) : THEME,
        panelCounts,
      );
    case 'full':
      return showStep(
        cursor,
        storyIndex,
        lastPanel >= 0 ? panelStep(lastPanel) : THEME,
        panelCounts,
      );
    default:
      return step satisfies never;
  }
}

/** The current story counts as fully revealed (R53); the last one ends the presentation. */
function nextStory(cursor: PresentationCursor, panelCounts: readonly number[]): PresentationCursor {
  const revealed = showStep(cursor, cursor.storyIndex, FULL, panelCounts);
  return cursor.storyIndex < panelCounts.length - 1
    ? showStep(revealed, cursor.storyIndex + 1, THEME, panelCounts)
    : { ...revealed, status: 'finished' };
}

function goToStory(
  cursor: PresentationCursor,
  storyIndex: number,
  panelCounts: readonly number[],
): PresentationCursor {
  if (storyIndex > cursor.maxStoryReached) {
    throw new DomainError('INVALID_STATE', 'Essa história ainda não foi apresentada.');
  }
  return showStep(cursor, storyIndex, FULL, panelCounts);
}

/**
 * R52: the host's navigation; `panelCounts[i]` is the panel count of story `i`. Actions the
 * table leaves without effect (D29) return the cursor unchanged.
 */
export function navigate(
  cursor: PresentationCursor,
  action: PresentationAction,
  panelCounts: readonly number[],
): PresentationCursor {
  if (action.action === 'goToStory') {
    return goToStory(cursor, action.storyIndex, panelCounts);
  }
  if (cursor.status === 'finished') {
    // `prev` leaves the end screen; nothing goes further than the end.
    return action.action === 'prev'
      ? showStep(cursor, panelCounts.length - 1, FULL, panelCounts)
      : cursor;
  }
  switch (action.action) {
    case 'next':
      return next(cursor, panelCounts);
    case 'prev':
      return prev(cursor, panelCounts);
    case 'showFull':
      return showStep(cursor, cursor.storyIndex, FULL, panelCounts);
    case 'nextStory':
      return nextStory(cursor, panelCounts);
    default:
      return action.action satisfies never;
  }
}

/**
 * R54: a panel is visible once its story was left behind, or, in the furthest story reached,
 * once its position was revealed.
 */
export function isPanelRevealed(
  cursor: PresentationCursor,
  storyIndex: number,
  position: number,
): boolean {
  if (storyIndex < cursor.maxStoryReached) {
    return true;
  }
  return (
    storyIndex === cursor.maxStoryReached && position < (cursor.revealedCount[storyIndex] ?? 0)
  );
}
