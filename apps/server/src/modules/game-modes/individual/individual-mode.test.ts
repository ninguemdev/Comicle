import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  STORY_SECONDS_OPTIONS,
  type MatchSettings,
} from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { individualMode } from './individual-mode';

const settings: MatchSettings = {
  mode: 'individual',
  panelCount: { kind: 'per_player' },
  drawingSeconds: 90,
  showPreviousPanels: false,
  authorDrawsLast: true,
  individual: { panelsPerStory: 4, storySeconds: 300 },
};

const withIndividual = (patch: Partial<MatchSettings['individual']>): MatchSettings => ({
  ...settings,
  individual: { ...settings.individual, ...patch },
});

function errorCodeOf(candidate: MatchSettings): string | undefined {
  const result = individualMode.validateSettings(candidate);
  return result.ok ? undefined : result.error.code;
}

const seatsOf = (n: number) => Array.from({ length: n }, (_, seat) => `p${String(seat)}`);

describe('individualMode', () => {
  it('R18: aceita 2 a 6 quadros por história e os tempos das opções', () => {
    for (const panelsPerStory of [2, 4, 6]) {
      expect(errorCodeOf(withIndividual({ panelsPerStory }))).toBeUndefined();
    }
    for (const storySeconds of STORY_SECONDS_OPTIONS) {
      expect(errorCodeOf(withIndividual({ storySeconds }))).toBeUndefined();
    }
  });

  it('R18: rejeita quadros fora de 2–6 ou fracionários e tempo fora das opções', () => {
    for (const panelsPerStory of [1, 7, 2.5]) {
      expect(errorCodeOf(withIndividual({ panelsPerStory }))).toBe('INVALID_PAYLOAD');
    }
    expect(errorCodeOf(withIndividual({ storySeconds: 90 }))).toBe('INVALID_PAYLOAD');
  });

  it('R62: ignora as opções do modo colaborativo', () => {
    const odd = { ...settings, showPreviousPanels: true, authorDrawsLast: false };
    expect(errorCodeOf(odd)).toBeUndefined();
    expect(individualMode.totalRounds(odd, 5)).toBe(4);
  });

  it('R62: recusa configurações de outro modo', () => {
    expect(errorCodeOf({ ...settings, mode: 'collaborative' })).toBe('INVALID_PAYLOAD');
  });

  it('R62: N − 1 rodadas; com 2 jogadores, uma só', () => {
    expect(individualMode.totalRounds(settings, 2)).toBe(1);
    expect(individualMode.totalRounds(settings, 7)).toBe(6);
    expect(individualMode.totalRounds(settings, 12)).toBe(11);
  });

  it('R64: nenhuma rodada tem leitura', () => {
    for (let round = 0; round < MAX_PLAYERS; round += 1) {
      expect(individualMode.hasReadingPhase(round)).toBe(false);
    }
  });

  it('R63: cada jogador desenha uma vez cada tema que não é seu, um por rodada', () => {
    for (let n = MIN_PLAYERS; n <= MAX_PLAYERS; n += 1) {
      const seats = seatsOf(n);
      const rounds = individualMode.totalRounds(settings, n);
      const { assignments } = individualMode.buildPlan(seats, rounds, settings);
      expect(assignments).toHaveLength(rounds);

      for (const round of assignments) {
        // A bijection: every theme goes to exactly one player each round.
        expect(new Set(Object.values(round)).size, `N=${String(n)}`).toBe(n);
      }
      seats.forEach((playerId, seat) => {
        const drawn = assignments.map((round) => round[playerId]);
        expect(drawn, `N=${String(n)} ${playerId}`).not.toContain(seat);
        expect(new Set(drawn).size, `N=${String(n)} ${playerId}`).toBe(n - 1);
      });
    }
  });

  it('R63: o plano segue a rotação do R31 sem o autor', () => {
    const { assignments } = individualMode.buildPlan(seatsOf(3), 2, settings);
    expect(assignments).toEqual([
      { p0: 2, p1: 0, p2: 1 },
      { p0: 1, p1: 2, p2: 0 },
    ]);
  });
});
