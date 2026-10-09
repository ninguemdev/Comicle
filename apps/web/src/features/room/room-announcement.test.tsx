import { defaultAvatar, type PresentationStep, type PresentationView } from '@comicle/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { lobbyView, matchView } from '../../test/room-fixtures';
import { RoomAnnouncer, roomAnnouncement } from './room-announcement';

const author = { playerId: 'p1', nickname: 'Ana', avatar: defaultAvatar() };

function presentation(
  step: PresentationStep,
  status: PresentationView['status'] = 'showing',
): PresentationView {
  return {
    status,
    storyIndex: 1,
    storyCount: 3,
    step,
    maxStoryReached: 1,
    story: { theme: { text: 'Um gato prefeito', author }, panelCount: 3, revealedPanels: [] },
    reachedStories: [],
  };
}

function presentationView(view: PresentationView) {
  return matchView({ phase: 'presentation', task: { kind: 'watch' }, presentation: view });
}

describe('roomAnnouncement', () => {
  it('anuncia a fase sem rodada nos temas', () => {
    expect(roomAnnouncement(matchView())).toBe('Temas');
  });

  it('anuncia a fase e a rodada', () => {
    const view = matchView({
      phase: 'round_reading',
      roundIndex: 1,
      task: { kind: 'read_story', status: 'ready', theme: 'Tema' },
    });
    expect(roomAnnouncement(view)).toBe('Leitura: rodada 2 de 3');
  });

  it('anuncia cada passo da apresentação', () => {
    expect(roomAnnouncement(presentationView(presentation({ kind: 'theme' })))).toBe(
      'História 2 de 3: tema',
    );
    expect(roomAnnouncement(presentationView(presentation({ kind: 'panel', position: 0 })))).toBe(
      'História 2 de 3: quadro 1',
    );
    expect(roomAnnouncement(presentationView(presentation({ kind: 'full' })))).toBe(
      'História 2 de 3: HQ completa',
    );
    expect(roomAnnouncement(presentationView(presentation({ kind: 'full' }, 'finished')))).toBe(
      'Fim das histórias',
    );
  });

  it('anuncia a volta ao lobby', () => {
    expect(roomAnnouncement(lobbyView())).toBe('De volta ao lobby');
  });
});

describe('RoomAnnouncer', () => {
  it('é uma única região aria-live que continua montada entre o lobby e a partida', () => {
    const { rerender } = render(<RoomAnnouncer view={lobbyView()} />);
    const region = screen.getByText('De volta ao lobby');
    expect(region.getAttribute('aria-live')).toBe('polite');

    rerender(<RoomAnnouncer view={matchView()} />);

    // Same element, new text: that is what makes screen readers read the change.
    expect(screen.getByText('Temas')).toBe(region);
  });
});
