import { describe, expect, it } from 'vitest';

import {
  finalPanel,
  testMatch,
  testRoundMatch,
  testStories,
} from '../../../test/support/room-builders';
import { initialPresentationCursor, navigate } from '../presentation/presentation-cursor';
import type { Match } from '../matches/match';
import {
  canAccessPanel,
  presentedPanels,
  readablePanels,
  referencePanels,
} from './panel-access-policy';

const players = ['ana', 'bia', 'caio'];

function panelIds(panelCount: number): string[] {
  return testStories(players, panelCount).flatMap((story) => story.panels.map((panel) => panel.id));
}

describe('PanelAccessPolicy', () => {
  it('R36: na leitura, só os quadros da história recebida, e só antes de confirmar', () => {
    // Round 2 of 3 (R31, D8): ana reads her own story.
    const reading = testRoundMatch(players, 'round_reading', 2);
    const accessible = panelIds(2).filter((id) => canAccessPanel(reading, 'ana', id));

    expect(accessible).toEqual(['panel-0-ana', 'panel-1-ana']);
    expect(readablePanels(reading, 'ana').map((panel) => panel.id)).toEqual(accessible);

    const confirmed = testRoundMatch(players, 'round_reading', 2, { ready: new Set(['ana']) });
    expect(panelIds(2).some((id) => canAccessPanel(confirmed, 'ana', id))).toBe(false);
    expect(readablePanels(confirmed, 'ana')).toEqual([]);
  });

  it('R59: espectador, ID desconhecido e qualquer outra fase → sem acesso', () => {
    const reading = testRoundMatch(players, 'round_reading', 2);
    expect(panelIds(2).some((id) => canAccessPanel(reading, 'davi', id))).toBe(false);
    expect(canAccessPanel(reading, 'ana', 'panel-inventado')).toBe(false);
    expect(canAccessPanel(null, 'ana', 'panel-0-caio')).toBe(false);

    const others = [
      testRoundMatch(players, 'round_drawing', 2),
      testRoundMatch(players, 'round_closing', 2),
      testMatch(players, {
        phase: 'presentation',
        roundIndex: 2,
        stories: testStories(players, 2),
      }),
    ];
    for (const match of others) {
      const anyAccess = players.some((p) => panelIds(2).some((id) => canAccessPanel(match, p, id)));
      expect(anyAccess).toBe(false);
    }
  });

  describe('R38: com showPreviousPanels', () => {
    const withReference = (match: Match): Match => ({
      ...match,
      settings: { ...match.settings, showPreviousPanels: true },
    });

    it('quem desenha vê os quadros anteriores da própria história, da confirmação à entrega', () => {
      // Round 2 of 3 (R31, D8): everyone draws the last panel of their own story.
      const confirmed = withReference(
        testRoundMatch(players, 'round_reading', 2, { ready: new Set(['ana']) }),
      );
      const ownStory = ['panel-0-ana', 'panel-1-ana'];
      expect(panelIds(2).filter((id) => canAccessPanel(confirmed, 'ana', id))).toEqual(ownStory);
      expect(referencePanels(confirmed, 'ana').map((panel) => panel.id)).toEqual(ownStory);
      // bia has not confirmed yet: she still reads, so she sees them as a reader.
      expect(referencePanels(confirmed, 'bia')).toEqual([]);

      for (const phase of ['round_drawing', 'round_closing'] as const) {
        const drawing = withReference(testRoundMatch(players, phase, 2));
        expect(panelIds(2).filter((id) => canAccessPanel(drawing, 'bia', id))).toEqual([
          'panel-0-bia',
          'panel-1-bia',
        ]);
        expect(panelIds(2).some((id) => canAccessPanel(drawing, 'davi', id))).toBe(false);
      }
    });

    it('depois de entregar, mais nada', () => {
      const handedIn = withReference(
        testRoundMatch(players, 'round_drawing', 2, {
          finals: new Map([['ana', finalPanel('done')]]),
        }),
      );

      expect(panelIds(2).some((id) => canAccessPanel(handedIn, 'ana', id))).toBe(false);
      expect(referencePanels(handedIn, 'ana')).toEqual([]);
    });

    it('desligada, o desenho não dá acesso a nenhum quadro', () => {
      const drawing = testRoundMatch(players, 'round_drawing', 2);
      expect(referencePanels(drawing, 'ana')).toEqual([]);
    });
  });

  it('R54: na apresentação, todos veem só os quadros revelados', () => {
    // ana's story fully revealed and left behind; bia's up to panel 0; caio's untouched.
    const cursor = navigate(
      navigate(initialPresentationCursor(3), { action: 'nextStory' }, [2, 2, 2]),
      { action: 'next' },
      [2, 2, 2],
    );
    const presenting = testMatch(players, {
      phase: 'presentation',
      roundIndex: 1,
      themes: new Map(),
      stories: testStories(players, 2),
      presentation: cursor,
    });

    for (const viewer of [...players, 'davi']) {
      const accessible = panelIds(2).filter((id) => canAccessPanel(presenting, viewer, id));
      expect(accessible).toEqual(['panel-0-ana', 'panel-1-ana', 'panel-0-bia']);
    }
    expect(presentedPanels(presenting).map((panel) => panel.id)).toEqual(['panel-0-bia']);
  });
});
