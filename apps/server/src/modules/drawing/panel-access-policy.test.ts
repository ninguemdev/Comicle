import { describe, expect, it } from 'vitest';

import { testMatch, testRoundMatch, testStories } from '../../../test/support/room-builders';
import { canAccessPanel, readablePanels } from './panel-access-policy';

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
});
