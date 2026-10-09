import { describe, expect, it } from 'vitest';

import { DomainError } from '../../platform/errors';
import { SeededRng } from '../../platform/random';
import {
  initialPresentationCursor,
  isPanelRevealed,
  navigate,
  type PresentationAction,
  type PresentationCursor,
} from './presentation-cursor';

// Three stories of three panels each.
const COUNTS = [3, 3, 3];

const NEXT: PresentationAction = { action: 'next' };
const PREV: PresentationAction = { action: 'prev' };
const SHOW_FULL: PresentationAction = { action: 'showFull' };
const NEXT_STORY: PresentationAction = { action: 'nextStory' };
const goTo = (storyIndex: number): PresentationAction => ({ action: 'goToStory', storyIndex });

function run(actions: PresentationAction[], from = initialPresentationCursor(COUNTS.length)) {
  return actions.reduce((cursor, action) => navigate(cursor, action, COUNTS), from);
}

/** `story:step` of the cursor, e.g. `1:panel(2)` or `finished`. */
function where(cursor: PresentationCursor): string {
  if (cursor.status === 'finished') {
    return 'finished';
  }
  const { step } = cursor;
  const label = step.kind === 'panel' ? `panel(${String(step.position)})` : step.kind;
  return `${String(cursor.storyIndex)}:${label}`;
}

describe('cursor da apresentação', () => {
  it('R51: começa no tema da história 0, nada revelado', () => {
    expect(initialPresentationCursor(3)).toEqual({
      status: 'showing',
      storyIndex: 0,
      step: { kind: 'theme' },
      maxStoryReached: 0,
      revealedCount: [0, 0, 0],
    });
  });

  it('R52, R53: next percorre tema, quadros, HQ completa e passa à próxima história', () => {
    const path: string[] = [];
    let cursor = initialPresentationCursor(COUNTS.length);
    const counts: number[][] = [];
    for (let i = 0; i < 15; i++) {
      cursor = navigate(cursor, NEXT, COUNTS);
      path.push(where(cursor));
      counts.push([...cursor.revealedCount]);
    }

    expect(path).toEqual([
      '0:panel(0)',
      '0:panel(1)',
      '0:panel(2)',
      '0:full',
      '1:theme',
      '1:panel(0)',
      '1:panel(1)',
      '1:panel(2)',
      '1:full',
      '2:theme',
      '2:panel(0)',
      '2:panel(1)',
      '2:panel(2)',
      '2:full',
      'finished',
    ]);
    expect(counts.slice(0, 5)).toEqual([
      [1, 0, 0],
      [2, 0, 0],
      [3, 0, 0],
      [3, 0, 0],
      [3, 0, 0],
    ]);
    expect(cursor).toMatchObject({ storyIndex: 2, step: { kind: 'full' }, maxStoryReached: 2 });
  });

  it('R52: prev volta quadro a quadro, do tema para a HQ completa da anterior', () => {
    const atStory1Panel1 = run([NEXT_STORY, NEXT, NEXT]);
    expect(where(atStory1Panel1)).toBe('1:panel(1)');

    const path: string[] = [];
    let cursor = atStory1Panel1;
    for (let i = 0; i < 4; i++) {
      cursor = navigate(cursor, PREV, COUNTS);
      path.push(where(cursor));
    }
    expect(path).toEqual(['1:panel(0)', '1:theme', '0:full', '0:panel(2)']);
    // R53: going back hides nothing.
    expect(cursor).toMatchObject({ maxStoryReached: 1, revealedCount: [3, 2, 0] });
  });

  it('R52: prev no tema da primeira história não muda nada', () => {
    const start = initialPresentationCursor(COUNTS.length);
    expect(navigate(start, PREV, COUNTS)).toEqual(start);
  });

  it('R52: prev em finished volta à HQ completa da última história', () => {
    const finished = run([NEXT_STORY, NEXT_STORY, NEXT_STORY]);
    expect(finished.status).toBe('finished');

    const back = navigate(finished, PREV, COUNTS);
    expect(back).toMatchObject({ status: 'showing', storyIndex: 2, step: { kind: 'full' } });
  });

  it('R52: em finished, next, showFull e nextStory não mudam nada', () => {
    const finished = run([NEXT_STORY, NEXT_STORY, NEXT_STORY]);
    for (const action of [NEXT, SHOW_FULL, NEXT_STORY]) {
      expect(navigate(finished, action, COUNTS)).toEqual(finished);
    }
  });

  it('R52, R53: showFull vai para a HQ completa e revela a história inteira', () => {
    const cursor = run([NEXT, SHOW_FULL]);
    expect(cursor).toMatchObject({
      storyIndex: 0,
      step: { kind: 'full' },
      revealedCount: [3, 0, 0],
    });
  });

  it('R52, R53: nextStory revela a atual inteira e vai ao tema da próxima; na última, encerra', () => {
    const second = run([NEXT, NEXT_STORY]);
    expect(second).toMatchObject({
      status: 'showing',
      storyIndex: 1,
      step: { kind: 'theme' },
      maxStoryReached: 1,
      revealedCount: [3, 0, 0],
    });

    const last = run([NEXT_STORY, NEXT_STORY, NEXT, NEXT_STORY]);
    expect(last).toMatchObject({
      status: 'finished',
      maxStoryReached: 2,
      revealedCount: [3, 3, 3],
    });
  });

  it('R52: goToStory vai para a HQ completa de uma história já alcançada, inclusive de finished', () => {
    const atStory2 = run([NEXT_STORY, NEXT_STORY]);
    expect(navigate(atStory2, goTo(0), COUNTS)).toMatchObject({
      status: 'showing',
      storyIndex: 0,
      step: { kind: 'full' },
      maxStoryReached: 2,
    });
    // The furthest story reached is revealed whole too.
    expect(navigate(atStory2, goTo(2), COUNTS).revealedCount).toEqual([3, 3, 3]);

    const finished = run([NEXT_STORY], atStory2);
    expect(navigate(finished, goTo(1), COUNTS)).toMatchObject({
      status: 'showing',
      storyIndex: 1,
      step: { kind: 'full' },
    });
  });

  it('R52: goToStory além de maxStoryReached → INVALID_STATE', () => {
    const atStory1 = run([NEXT_STORY]);
    for (const storyIndex of [2, 3]) {
      expect(() => navigate(atStory1, goTo(storyIndex), COUNTS)).toThrow(
        expect.objectContaining({ code: 'INVALID_STATE' }),
      );
    }
  });

  it('R52: história sem quadros vai do tema direto à HQ completa', () => {
    const counts = [0, 2];
    const start = initialPresentationCursor(2);
    const full = navigate(start, NEXT, counts);
    expect(full).toMatchObject({ storyIndex: 0, step: { kind: 'full' } });
    expect(navigate(full, PREV, counts)).toMatchObject({ step: { kind: 'theme' } });
  });

  it('R53: revealedCount e maxStoryReached nunca diminuem em 500 ações aleatórias', () => {
    const rng = new SeededRng(16);
    const counts = [4, 4, 4, 4];
    const kinds = ['next', 'prev', 'showFull', 'nextStory', 'goToStory'] as const;
    let cursor = initialPresentationCursor(counts.length);
    for (let i = 0; i < 500; i++) {
      const kind = kinds[rng.nextInt(kinds.length)] ?? 'next';
      const action: PresentationAction =
        kind === 'goToStory' ? goTo(rng.nextInt(counts.length)) : { action: kind };
      let next = cursor;
      try {
        next = navigate(cursor, action, counts);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect(action.action).toBe('goToStory');
      }
      expect(next.maxStoryReached).toBeGreaterThanOrEqual(cursor.maxStoryReached);
      next.revealedCount.forEach((count, story) => {
        expect(count).toBeGreaterThanOrEqual(cursor.revealedCount[story] ?? 0);
      });
      // Every story left behind is revealed whole.
      for (let story = 0; story < next.maxStoryReached; story++) {
        expect(next.revealedCount[story]).toBe(counts[story]);
      }
      cursor = next;
    }
    expect(cursor.maxStoryReached).toBe(counts.length - 1);
  });

  it('R54: quadro revelado só em história deixada para trás ou até revealedCount na mais avançada', () => {
    const cursor = run([NEXT_STORY, NEXT, NEXT]);
    expect(cursor).toMatchObject({ maxStoryReached: 1, revealedCount: [3, 2, 0] });

    expect([0, 1, 2].map((p) => isPanelRevealed(cursor, 0, p))).toEqual([true, true, true]);
    expect([0, 1, 2].map((p) => isPanelRevealed(cursor, 1, p))).toEqual([true, true, false]);
    expect([0, 1, 2].map((p) => isPanelRevealed(cursor, 2, p))).toEqual([false, false, false]);

    // Going back to the theme hides nothing.
    const back = run([PREV, PREV], cursor);
    expect(isPanelRevealed(back, 1, 1)).toBe(true);
  });
});
