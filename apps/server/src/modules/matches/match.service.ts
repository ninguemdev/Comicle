import type { Empty, MatchAbortReason, Rng } from '@comicle/shared';
import type { FastifyBaseLogger } from 'fastify';

import type { Clock } from '../../platform/clock';
import { shuffled } from '../../platform/random';
import type { Scheduler } from '../../platform/scheduler';
import { assertValidPanelImage } from '../drawing/panel-image';
import { getGameMode } from '../game-modes/registry';
import type { PresentationAction } from '../presentation/presentation-cursor';
import { assertCanAbortMatch, assertCanStartMatch, assertHost } from '../rooms/host-policy';
import { socketIdOf, type Room } from '../rooms/room';
import type { RoomBroadcaster } from '../rooms/room-broadcaster';
import { runAsMember, scheduleInRoom } from '../rooms/room-access';
import type { RoomRegistry } from '../rooms/room-registry';
import { timerKeys } from '../rooms/timer-keys';
import { FALLBACK_THEMES } from '../stories/fallback-themes';
import type { MatchStatus, NewPanel, StoryRepository } from '../stories/story-repository';
import type { GameTimingConfig } from '../timing/game-timing';
import type { PublishRoom } from '../views/room-publisher';
import { newMatchRecord, type Match, type PanelSubmitReason } from './match';
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
  broadcaster: RoomBroadcaster;
  publish: PublishRoom;
  /** The room is back in the lobby: lobby-only rules (R13) apply again. */
  onReturnToLobby: (room: Room) => void;
  log: FastifyBaseLogger;
}

/** arquitetura §4, Persistência: one retry, then the match is aborted (R57). */
const PERSIST_ATTEMPTS = 2;

export interface PanelSubmission {
  roundIndex: number;
  reason: PanelSubmitReason;
  png: Uint8Array | null;
}

/**
 * Match lifecycle (R22–R45, R57): runs the phase machine inside the room's queue, then its
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
        panelIds: Array.from({ length: totalRounds }, () => participants.map(() => newId())),
        previousMatchId: room.lastMatchId,
      });
      return {};
    });
  }

  /** R57. */
  abort(socketId: string): Promise<Empty> {
    return this.asMember(socketId, async (room, playerId) => {
      assertCanAbortMatch(room, playerId);
      await this.apply(room, { type: 'abort', reason: 'host' });
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

  /** R36, R37. */
  confirmReading(socketId: string, roundIndex: number): Promise<Empty> {
    return this.asMember(socketId, async (room, playerId) => {
      await this.apply(room, {
        type: 'round_ready',
        playerId,
        roundIndex,
        connected: connectedPlayers(room),
      });
      return {};
    });
  }

  /** R39. */
  async autosavePanel(socketId: string, roundIndex: number, png: Uint8Array): Promise<Empty> {
    assertValidPanelImage(png);
    return this.asMember(socketId, async (room, playerId) => {
      // Only `hasDraft` changes, which matters when (re)connecting and comes with that view;
      // publishing here would send every member a view per autosave for nothing.
      await this.transition(room, { type: 'panel_autosave', playerId, roundIndex, png });
      return {};
    });
  }

  /** R40–R44. */
  async submitPanel(
    socketId: string,
    { roundIndex, reason, png }: PanelSubmission,
  ): Promise<Empty> {
    if (png !== null) {
      assertValidPanelImage(png);
    }
    return this.asMember(socketId, async (room, playerId) => {
      await this.apply(room, { type: 'panel_submit', playerId, roundIndex, reason, png });
      return {};
    });
  }

  /** R52, R53: only the host moves the presentation; everyone sees the same step. */
  navigatePresentation(socketId: string, action: PresentationAction): Promise<Empty> {
    return this.asMember(socketId, async (room, playerId) => {
      assertHost(room, playerId);
      await this.apply(room, { type: 'presentation_navigate', action });
      return {};
    });
  }

  /** R56. */
  endPresentation(socketId: string): Promise<Empty> {
    return this.asMember(socketId, async (room, playerId) => {
      assertHost(room, playerId);
      await this.apply(room, { type: 'presentation_end' });
      return {};
    });
  }

  /** R37: called by the rooms module, inside the room's queue, which publishes afterwards. */
  async handlePresenceChange(room: Room): Promise<void> {
    await this.transition(room, { type: 'presence_changed', connected: connectedPlayers(room) });
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
        await this.transition(room, { type: 'abort', reason: 'persistence_failed' });
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
      case 'persist_round':
        return this.persistRound(room, effect.panels);
      case 'set_match_status':
        await this.setMatchStatus(room, effect.matchId, effect.status);
        return true;
      case 'emit_collect':
        this.toConnected(room, (socketId) => {
          this.deps.broadcaster.sendCollect(socketId, effect.roundIndex);
        });
        return true;
      case 'notify_aborted':
        this.notifyAborted(room, effect.reason);
        return true;
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
    return this.persist(room, 'failed to persist match', () =>
      this.deps.storyRepository.createMatch(record),
    );
  }

  /** R42: the panels of a round, all or nothing. */
  private async persistRound(room: Room, panels: NewPanel[]): Promise<boolean> {
    const matchId = room.match?.id;
    if (matchId === undefined) {
      return true;
    }
    return this.persist(room, 'failed to persist round', () =>
      this.deps.storyRepository.saveRoundPanels(matchId, panels),
    );
  }

  /** Tries `write` up to PERSIST_ATTEMPTS times; `false` when every attempt failed. */
  private async persist(room: Room, message: string, write: () => Promise<void>): Promise<boolean> {
    for (let attempt = 1; attempt <= PERSIST_ATTEMPTS; attempt++) {
      try {
        await write();
        return true;
      } catch (error) {
        this.deps.log.error(
          { err: error, roomId: room.id, matchId: room.match?.id, attempt },
          message,
        );
      }
    }
    return false;
  }

  /** Only logged: the status is bookkeeping, the match goes on without it. */
  private async setMatchStatus(room: Room, matchId: string, status: MatchStatus): Promise<void> {
    try {
      await this.deps.storyRepository.setMatchStatus(matchId, status);
    } catch (error) {
      this.deps.log.error(
        { err: error, roomId: room.id, matchId, status },
        'failed to set match status',
      );
    }
  }

  /** R57: sent before the lobby view, so clients know why the match ended. */
  private notifyAborted(room: Room, reason: MatchAbortReason): void {
    this.toConnected(room, (socketId) => {
      this.deps.broadcaster.sendMatchAborted(socketId, reason);
    });
  }

  private toConnected(room: Room, send: (socketId: string) => void): void {
    for (const member of room.members.values()) {
      const socketId = socketIdOf(member);
      if (socketId !== null) {
        send(socketId);
      }
    }
  }

  /**
   * R25, R57. A failure is only logged: an aborted match stays as `lastMatchId`, so the next
   * start tries again (R25); closing the room (R16) or the next boot (R17) cleans up the rest.
   */
  private async deleteMatch(room: Room, matchId: string): Promise<void> {
    try {
      await this.deps.storyRepository.deleteMatch(matchId);
    } catch (error) {
      this.deps.log.error({ err: error, roomId: room.id, matchId }, 'failed to delete match');
      return;
    }
    if (room.lastMatchId === matchId) {
      room.lastMatchId = null;
    }
  }
}

function connectedPlayers(room: Room): ReadonlySet<string> {
  return new Set(room.connectedMembers().map((member) => member.playerId));
}
