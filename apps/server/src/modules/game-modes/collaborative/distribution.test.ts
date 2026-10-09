import {
  FIXED_PANEL_COUNT_MAX,
  FIXED_PANEL_COUNT_MIN,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from '@comicle/shared';
import { describe, expect, it } from 'vitest';

import { playerForStory, storyForPlayer, type DistributionPlan } from '../game-mode';
import { buildCollaborativePlan } from './distribution';

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

function seatsOf(n: number): string[] {
  return range(0, n - 1).map((i) => `p${String(i)}`);
}

/** Every (N, totalRounds) pair required by R32. */
const cases = range(MIN_PLAYERS, MAX_PLAYERS).flatMap((n) =>
  range(FIXED_PANEL_COUNT_MIN, FIXED_PANEL_COUNT_MAX).map((totalRounds) => {
    const seats = seatsOf(n);
    return { n, totalRounds, seats, plan: buildCollaborativePlan(seats, totalRounds) };
  }),
);

function label(n: number, totalRounds: number): string {
  return `N=${String(n)} rodadas=${String(totalRounds)}`;
}

/** Artists of story `story` across all rounds, in order. */
function artistsOf(plan: DistributionPlan, story: number): (string | undefined)[] {
  return plan.assignments.map((_, round) => playerForStory(plan, round, story));
}

describe('buildCollaborativePlan', () => {
  it('R31: tabela do exemplo com 5 jogadores', () => {
    const plan = buildCollaborativePlan(['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa'], 5);

    expect(artistsOf(plan, 0)).toEqual(['Bruno', 'Carla', 'Diego', 'Elisa', 'Ana']);
    expect(artistsOf(plan, 1)).toEqual(['Carla', 'Diego', 'Elisa', 'Ana', 'Bruno']);
  });

  it('R31: a história s_i vai para o assento (i + 1 + (r mod N)) mod N', () => {
    for (const { n, totalRounds, seats, plan } of cases) {
      for (let round = 0; round < totalRounds; round++) {
        for (let story = 0; story < n; story++) {
          expect(playerForStory(plan, round, story), label(n, totalRounds)).toBe(
            seats[(story + 1 + (round % n)) % n],
          );
        }
      }
    }
  });

  it('R32: cada rodada é uma bijeção entre jogadores e histórias', () => {
    for (const { n, totalRounds, seats, plan } of cases) {
      expect(plan.assignments, label(n, totalRounds)).toHaveLength(totalRounds);
      for (const round of plan.assignments) {
        expect(Object.keys(round).sort(), label(n, totalRounds)).toEqual([...seats].sort());
        expect(
          Object.values(round).sort((a, b) => a - b),
          label(n, totalRounds),
        ).toEqual(range(0, n - 1));
      }
    }
  });

  it('R32: nenhum jogador recebe a mesma história em rodadas consecutivas', () => {
    for (const { n, totalRounds, seats, plan } of cases) {
      for (const playerId of seats) {
        for (let round = 1; round < totalRounds; round++) {
          expect(storyForPlayer(plan, round, playerId), label(n, totalRounds)).not.toBe(
            storyForPlayer(plan, round - 1, playerId),
          );
        }
      }
    }
  });

  it('R32: com totalRounds ≤ N − 1, o autor nunca desenha a própria história', () => {
    for (const { n, totalRounds, seats, plan } of cases.filter((c) => c.totalRounds <= c.n - 1)) {
      seats.forEach((author, story) => {
        expect(artistsOf(plan, story), label(n, totalRounds)).not.toContain(author);
      });
    }
  });

  it('R32: com totalRounds ≤ N, todos os quadros de uma história têm artistas diferentes', () => {
    for (const { n, totalRounds, plan } of cases.filter((c) => c.totalRounds <= c.n)) {
      for (let story = 0; story < n; story++) {
        const artists = artistsOf(plan, story);
        expect(new Set(artists).size, label(n, totalRounds)).toBe(artists.length);
      }
    }
  });

  it('R32: com totalRounds = N, cada jogador contribui exatamente uma vez para cada história', () => {
    for (const { n, totalRounds, seats, plan } of cases.filter((c) => c.totalRounds === c.n)) {
      for (let story = 0; story < n; story++) {
        expect(artistsOf(plan, story).sort(), label(n, totalRounds)).toEqual([...seats].sort());
      }
    }
  });

  it('D8: com totalRounds = N, o autor desenha o último quadro da própria história', () => {
    for (const { n, totalRounds, seats, plan } of cases.filter((c) => c.totalRounds === c.n)) {
      seats.forEach((author, story) => {
        expect(storyForPlayer(plan, n - 1, author), label(n, totalRounds)).toBe(story);
      });
    }
  });

  it('rejeita assentos vazios ou repetidos e totalRounds inválido', () => {
    expect(() => buildCollaborativePlan([], 2)).toThrow(RangeError);
    expect(() => buildCollaborativePlan(['a', 'a'], 2)).toThrow(RangeError);
    expect(() => buildCollaborativePlan(['a', 'b'], 0)).toThrow(RangeError);
    expect(() => buildCollaborativePlan(['a', 'b'], 1.5)).toThrow(RangeError);
  });
});

describe('storyForPlayer / playerForStory', () => {
  const plan = buildCollaborativePlan(['ana', 'bruno', 'carla'], 3);

  it('R31: encontram quem desenha cada história e vice-versa', () => {
    expect(playerForStory(plan, 0, 0)).toBe('bruno');
    expect(storyForPlayer(plan, 0, 'bruno')).toBe(0);
    expect(playerForStory(plan, 2, 1)).toBe('bruno');
    expect(storyForPlayer(plan, 2, 'bruno')).toBe(1);
  });

  it('são inversas uma da outra em todas as rodadas', () => {
    plan.assignments.forEach((round, r) => {
      for (const [playerId, story] of Object.entries(round)) {
        expect(storyForPlayer(plan, r, playerId)).toBe(story);
        expect(playerForStory(plan, r, story)).toBe(playerId);
      }
    });
  });

  it('devolvem undefined para quem não participa ou fora do plano', () => {
    expect(storyForPlayer(plan, 0, 'espectador')).toBeUndefined();
    expect(storyForPlayer(plan, 0, 'constructor')).toBeUndefined();
    expect(storyForPlayer(plan, 3, 'ana')).toBeUndefined();
    expect(playerForStory(plan, 3, 0)).toBeUndefined();
    expect(playerForStory(plan, 0, 3)).toBeUndefined();
  });
});
