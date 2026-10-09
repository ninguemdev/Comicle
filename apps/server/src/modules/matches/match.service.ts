import type { Empty, Rng } from '@comicle/shared';
import type { FastifyBaseLogger } from 'fastify';

import type { Clock } from '../../platform/clock';
import { shuffled } from '../../platform/random';
import type { Scheduler } from '../../platform/scheduler';
import { getGameMode } from '../game-modes/registry';
import { assertCanAbortMatch, assertCanStartMatch } from '../rooms/host-policy';
import type { Room } from '../rooms/room';
import { runAsMember, scheduleInRoom } from '../rooms/room-access';
import type { RoomRegistry } from '../rooms/room-registry';
import { timerKeys } from '../rooms/timer-keys';
import { FALLBACK_THEMES } from '../stories/fallback-themes';
import type { StoryRepository } from '../stories/story-repository';
import type { GameTimingConfig } from '../timing/game-timing';
import type { PublishRoom } from '../views/room-publisher';
import { newMatchRecord, type Match } from './match';
import {
  createMatchMachine,
  type MatchEffect,
  type MatchEvent,
  type MatchMachine,
} from './match-machine';

export interface MatchServiceDeps {
  clock: Clock;
  scheduler: Scheduler;
  rng: Rng;
  newId: () => string;
  storyRepository: StoryRepository;
  timing: GameTimingConfig;
  registry: RoomRegistry;
  publish: PublishRoom;
  /** The room is back in the lobby: lobby-only rules (R13) apply again. */
  onReturnToLobby: (room: Room) => void;
  log: FastifyBaseLogger;
}

/** arquitetura §4, Persistência: one retry, then the match is aborted (R57). */
const PERSIST_ATTEMPTS = 2;

/**
 * Match lifecycle (R22–R30, R57): runs the phase machine inside the room's queue, then its
 * effects (timers, persistence), then publishes the new views.
 */
export class MatchService {
  private readonly machine: MatchMachine;

  constructor(private readonly deps: MatchServiceDeps) {
    this.machine = createMatchMachine(deps.timing);
  }

  /** R22–R25. */
  start(socketId: string): Promise<Empty> {
    return this.asMember(socketId, async (room, playerId) => {
      assertCanStartMatch(room, playerId);
      const { settings } = room;
      const mode = getGameMode(settings.mode);
      const validation = mode.validateSettings(settings);
      if (!validation.ok) {
        throw validation.error;
      }
      const { rng, newId } = this.deps;
      // R23, R24: whoever is connected right now plays, in random seat order.
      const participants = shuffled(room.connectedMembers(), rng);
      const totalRounds = mode.totalRounds(settings, participants.length);
      await this.apply(room, {
        type: 'start',
        id: newId(),
        settings,
        seats: participants.map((member) => ({
          playerId: member.playerId,
          nickname: member.profile.nickname,
          themeId: newId(),
          storyId: newId(),
        })),
        totalRounds,
        plan: mode.buildPlan(
          participants.map((member) => member.playerId),
          totalRounds,
        ),
        fallbackThemes: shuffled(FALLBACK_THEMES, rng),
        previousMatchId: room.lastMatchId,
      });
      return {};
    });
  }

  /** R57. */
  abort(socketId: string): Promise<Empty> {
    return this.asMember(socketId, async (room, playerId) => {
      assertCanAbortMatch(room, playerId);
      await this.apply(room, { type: 'abort' });
      return {};
    });
  }

  /** R28. */
  draftTheme(socketId: string, text: string): Promise<Empty> {
    return this.asMember(socketId, async (room, playerId) => {
      await this.apply(room, { type: 'theme_draft', playerId, text });
      return {};
    });
  }

  /** R27–R29. */
  submitTheme(socketId: string, text: string): Promise<Empty> {
    return this.asMember(socketId, async (room, playerId) => {
      await this.apply(room, { type: 'theme_submit', playerId, text });
      return {};
    });
  }

  private asMember<T>(
    socketId: string,
    task: (room: Room, playerId: string) => Promise<T>,
  ): Promise<T> {
    return runAsMember(this.deps.registry, socketId, (room, member) => task(room, member.playerId));
  }

  private async apply(room: Room, event: MatchEvent): Promise<void> {
    await this.transition(room, event);
    this.deps.publish(room);
  }

  private async transition(room: Room, event: MatchEvent): Promise<void> {
    const { match, effects } = this.machine.transition(room.match, event, this.deps.clock.now());
    this.setMatch(room, match);
    for (const effect of effects) {
      if (!(await this.runEffect(room, effect))) {
        await this.transition(room, { type: 'abort' });
        return;
      }
    }
  }

  private setMatch(room: Room, match: Match | null): void {
    const wasInMatch = room.match !== null;
    room.match = match;
    room.status = match === null ? 'lobby' : 'in_match';
    if (match !== null) {
      room.lastMatchId = match.id;
    }
    if (wasInMatch && match === null) {
      this.deps.onReturnToLobby(room);
    }
  }

  /** Runs one effect; `false` means the match can no longer go on and must be aborted. */
  private async runEffect(room: Room, effect: MatchEffect): Promise<boolean> {
    const { scheduler } = this.deps;
    switch (effect.type) {
      case 'schedule_phase': {
        const matchId = room.match?.id;
        scheduleInRoom(scheduler, room, timerKeys.phase(room), effect.at, () =>
          this.onPhaseDeadline(room, matchId),
        );
        return true;
      }
      case 'cancel_phase':
        scheduler.cancel(timerKeys.phase(room));
        return true;
      case 'persist_match':
        return this.persistMatch(room);
      case 'delete_match':
        await this.deleteMatch(room, effect.matchId);
        return true;
      default:
        return effect satisfies never;
    }
  }

  private async onPhaseDeadline(room: Room, matchId: string | undefined): Promise<void> {
    // The room closed or the match changed since the timer was set.
    if (room.closed || room.match === null || room.match.id !== matchId) {
      return;
    }
    await this.apply(room, { type: 'phase_deadline' });
  }

  private async persistMatch(room: Room): Promise<boolean> {
    if (room.match === null) {
      return true;
    }
    const record = newMatchRecord(room.id, room.match);
    for (let attempt = 1; attempt <= PERSIST_ATTEMPTS; attempt++) {
      try {
        await this.deps.storyRepository.createMatch(record);
        return true;
      } catch (error) {
        this.deps.log.error(
          { err: error, roomId: room.id, matchId: record.id, attempt },
          'failed to persist match',
        );
      }
    }
    return false;
  }

  /** R25, R57. A failure is only logged: closing the room (R16) or the next boot (R17) cleans up. */
  private async deleteMatch(room: Room, matchId: string): Promise<void> {
    if (room.lastMatchId === matchId) {
      room.lastMatchId = null;
    }
    try {
      await this.deps.storyRepository.deleteMatch(matchId);
    } catch (error) {
      this.deps.log.error({ err: error, roomId: room.id, matchId }, 'failed to delete match');
    }
  }
}
