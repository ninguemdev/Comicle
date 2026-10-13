import type { MatchView, PlayerTask, PlayerView, PresentationView } from '@comicle/shared';
import { useEffect, useRef } from 'react';

import type { SoundId } from './sound-catalog';
import { soundEngine } from './sound-engine';

// Which sounds a change of the room means (docs/sons.md §3). Pure: it compares the previous
// PlayerView with the new one; the hook below only plays what it returns.

/** The task the player is actively doing, as a key that changes when a new one begins. */
function activeTaskKey(match: MatchView): string | null {
  const { task } = match;
  switch (task.kind) {
    case 'write_theme':
      return task.status === 'writing' ? 'write_theme' : null;
    case 'read_story':
      return `read_story:${String(match.roundIndex)}`;
    case 'draw_panel':
      return task.status === 'drawing' ? `draw_panel:${String(match.roundIndex)}` : null;
    case 'wait':
    case 'spectate':
    case 'watch':
      return null;
    default:
      return task satisfies never;
  }
}

function isSubmitted(task: PlayerTask): boolean {
  return (task.kind === 'write_theme' || task.kind === 'draw_panel') && task.status === 'submitted';
}

/** A new turn (theme, reading, drawing), except one the player started with their own click. */
function turnSounds(previous: MatchView, next: MatchView): SoundId[] {
  const nextKey = activeTaskKey(next);
  if (nextKey === null || nextKey === activeTaskKey(previous)) {
    return [];
  }
  // R36: confirming the reading keeps the phase; the click already made its sound.
  const confirmedOwnReading = previous.task.kind === 'read_story' && previous.phase === next.phase;
  return confirmedOwnReading ? [] : ['turn'];
}

/** The player's own theme or panel just reached the server. */
function submitSounds(previous: MatchView, next: MatchView): SoundId[] {
  const sameTask = previous.task.kind === next.task.kind && previous.roundIndex === next.roundIndex;
  return sameTask && !isSubmitted(previous.task) && isSubmitted(next.task) ? ['submit'] : [];
}

function stepKey(presentation: PresentationView): string {
  const { step } = presentation;
  const position = step.kind === 'panel' ? String(step.position) : '';
  return `${String(presentation.storyIndex)}:${step.kind}${position}:${presentation.status}`;
}

/** R51–R53: every new step of the presentation; the full comic gets the fanfare. */
function presentationSounds(previous: MatchView, next: MatchView): SoundId[] {
  const shown = next.presentation;
  if (shown === null || shown.status === 'finished') {
    return [];
  }
  if (previous.presentation !== null && stepKey(previous.presentation) === stepKey(shown)) {
    return [];
  }
  return [shown.step.kind === 'full' ? 'fanfare' : 'reveal'];
}

/** Someone entered or left the lobby; reconnections keep the member, so they are silent. */
function memberSounds(previous: PlayerView, next: PlayerView): SoundId[] {
  if (previous.room.status !== 'lobby' || next.room.status !== 'lobby') {
    return [];
  }
  const before = new Set(previous.room.members.map((member) => member.playerId));
  const after = new Set(next.room.members.map((member) => member.playerId));
  const sounds: SoundId[] = [];
  if ([...after].some((playerId) => !before.has(playerId))) {
    sounds.push('join');
  }
  if ([...before].some((playerId) => !after.has(playerId))) {
    sounds.push('leave');
  }
  return sounds;
}

/**
 * The sounds for going from `previous` to `next` (docs/sons.md §3). The first view of a room
 * (arriving, reloading, reconnecting) only sets the starting point: nothing plays.
 */
export function soundsForChange(previous: PlayerView | null, next: PlayerView): SoundId[] {
  if (previous === null || previous.room.code !== next.room.code) {
    return [];
  }
  const sounds = memberSounds(previous, next);
  const before = previous.match;
  const after = next.match;
  if (before === null && after !== null) {
    // The start covers the first turn (writing the theme).
    return [...sounds, 'start'];
  }
  if (before === null || after === null) {
    return sounds;
  }
  return [
    ...sounds,
    ...turnSounds(before, after),
    ...submitSounds(before, after),
    ...presentationSounds(before, after),
  ];
}

/** Plays the sounds of each new view of the room; `null` (out of the room) starts over. */
export function useGameSounds(view: PlayerView | null): void {
  const previous = useRef<PlayerView | null>(null);
  useEffect(() => {
    if (view === null) {
      previous.current = null;
      return;
    }
    for (const id of soundsForChange(previous.current, view)) {
      soundEngine.play(id);
    }
    previous.current = view;
  }, [view]);
}
