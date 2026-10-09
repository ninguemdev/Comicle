import {
  fail,
  type Ack,
  type ClientEventAckData,
  type ClientEventName,
  type ClientEventPayload,
  type Empty,
  type ErrorCode,
  type MatchAbortReason,
  type PlayerProfile,
  type PlayerView,
  type RoomRemovedReason,
} from '@comicle/shared';
import { create } from 'zustand';

import { env } from '../config/env';
import {
  createSocketClient,
  type ConnectionStatus,
  type SocketClient,
  type SocketClientOptions,
} from '../lib/socket-client';
import { startTimeSync, type TimeSample } from '../lib/time-sync';
import { strings } from '../strings/pt-BR';
import { useSessionStore } from './session-store';

/** Settings the server accepts in v1 (only the collaborative mode, R21). */
export type SettingsInput = ClientEventPayload<'room:updateSettings'>['settings'];

/** Why the player is no longer in the room: removed by the server or replaced by another tab (R5). */
export type RoomExit = RoomRemovedReason | 'replaced';

export type PanelSubmitReason = ClientEventPayload<'panel:submit'>['reason'];

/** R52: what the host asks of the presentation cursor. */
export type PresentationAction = ClientEventPayload<'presentation:navigate'>;

/**
 * A one-off message from the server, numbered so the same message twice still changes state
 * (two rounds collected, two matches aborted).
 */
export interface ServerSignal<T> {
  readonly seq: number;
  readonly payload: T;
}

interface RoomState {
  /** Last `room:view`: the only source of game state on the client (arquitetura §5). */
  view: PlayerView | null;
  /** Set by `room:removed` and `session:replaced`; cleared by the next create or join. */
  exit: RoomExit | null;
  connection: ConnectionStatus;
  /** Server clock minus local clock (protocolo §6). */
  clockOffsetMs: number;
  /** R42: the server asked for the panels still on screen. */
  collect: ServerSignal<{ roundIndex: number }> | null;
  /** R57: the match went back to the lobby before its end. */
  matchAborted: ServerSignal<{ reason: MatchAbortReason }> | null;
  /**
   * Counts the `room:join` acks that succeeded: a new value means the player is (back) in the
   * room and an action that failed while offline may be sent again (T18).
   */
  joins: number;
  actions: {
    /**
     * Opens the socket once per page. Later calls only matter after the connection gave up
     * (`offline`): they retry with the given token.
     */
    connect(token: string): void;
    createRoom(profile: PlayerProfile): Promise<Ack<{ roomCode: string }>>;
    /** Also re-enters a room the player is already in (reconnection, edited profile). */
    joinRoom(roomCode: string, profile: PlayerProfile): Promise<Ack<{ roomCode: string }>>;
    leaveRoom(): Promise<Ack<Empty>>;
    kick(playerId: string): Promise<Ack<Empty>>;
    updateSettings(settings: SettingsInput): Promise<Ack<Empty>>;
    startMatch(): Promise<Ack<Empty>>;
    abortMatch(): Promise<Ack<Empty>>;
    draftTheme(text: string): Promise<Ack<Empty>>;
    submitTheme(text: string): Promise<Ack<Empty>>;
    confirmReading(roundIndex: number): Promise<Ack<Empty>>;
    autosavePanel(roundIndex: number, png: Uint8Array): Promise<Ack<Empty>>;
    submitPanel(
      roundIndex: number,
      reason: PanelSubmitReason,
      png: Uint8Array | null,
    ): Promise<Ack<Empty>>;
    /** R52: host only; the server answers NOT_HOST otherwise. */
    navigatePresentation(action: PresentationAction): Promise<Ack<Empty>>;
    /** R56: back to the lobby. */
    endPresentation(): Promise<Ack<Empty>>;
  };
}

export interface RoomStoreDeps {
  createSocketClient(options: SocketClientOptions): SocketClient;
  /** New session token after the server refused the current one, or `null` on failure. */
  renewSession(): Promise<string | null>;
}

/** A room the player was in no longer exists. */
function isGone(code: ErrorCode): boolean {
  return code === 'ROOM_NOT_FOUND' || code === 'ROOM_CLOSED';
}

export function createRoomStore(deps: RoomStoreDeps) {
  let client: SocketClient | null = null;
  let stopTimeSync: (() => void) | null = null;
  let signals = 0;

  return create<RoomState>()((set, get) => {
    async function requestTimeSample(socket: SocketClient): Promise<TimeSample | null> {
      const clientSentAt = Date.now();
      const ack = await socket.emitWithAck('time:sync', { clientSentAt });
      return ack.ok
        ? { clientSentAt, serverNow: ack.data.serverNow, receivedAt: Date.now() }
        : null;
    }

    function handleStatus(status: ConnectionStatus): void {
      set({ connection: status });
      stopTimeSync?.();
      stopTimeSync = null;
      if (status === 'connected' && client !== null) {
        const socket = client;
        // Measured on every (re)connection, as the network path may have changed.
        stopTimeSync = startTimeSync({
          requestSample: () => requestTimeSample(socket),
          onOffset: (clockOffsetMs) => {
            set({ clockOffsetMs });
          },
        });
      }
    }

    function emit<E extends ClientEventName>(
      event: E,
      payload: ClientEventPayload<E>,
    ): Promise<Ack<ClientEventAckData[E]>> {
      // Offline, an action fails at once: Socket.IO would buffer it and send it on reconnecting,
      // before the `room:join` that puts the socket back in the room.
      if (client === null || get().connection !== 'connected') {
        return Promise.resolve(fail('INTERNAL', strings.connection.offline));
      }
      return client.emitWithAck(event, payload);
    }

    function leftRoom(exit: RoomExit): void {
      set({ view: null, exit });
    }

    async function handleUnauthorized(): Promise<void> {
      const token = await deps.renewSession();
      if (token === null) {
        set({ connection: 'offline' });
        return;
      }
      client?.reconnectWithToken(token);
    }

    return {
      view: null,
      exit: null,
      connection: 'connecting',
      clockOffsetMs: 0,
      collect: null,
      matchAborted: null,
      joins: 0,
      actions: {
        connect(token) {
          if (client !== null) {
            if (get().connection === 'offline') {
              set({ connection: 'connecting' });
              client.reconnectWithToken(token);
            }
            return;
          }
          client = deps.createSocketClient({
            serverUrl: env.serverUrl,
            token,
            onStatusChange: handleStatus,
            onUnauthorized: () => void handleUnauthorized(),
          });
          client.on('room:view', (view) => {
            set({ view });
          });
          client.on('room:removed', ({ reason }) => {
            leftRoom(reason);
          });
          client.on('session:replaced', () => {
            leftRoom('replaced');
          });
          client.on('round:collect', (payload) => {
            set({ collect: { seq: ++signals, payload } });
          });
          client.on('match:aborted', (payload) => {
            set({ matchAborted: { seq: ++signals, payload } });
          });
          client.connect();
        },
        createRoom(profile) {
          set({ exit: null });
          return emit('room:create', { profile });
        },
        async joinRoom(roomCode, profile) {
          set({ exit: null });
          const wasInRoom = get().view?.room.code === roomCode;
          const ack = await emit('room:join', { roomCode, profile });
          if (ack.ok) {
            set((state) => ({ joins: state.joins + 1 }));
          } else if (wasInRoom && isGone(ack.error.code)) {
            // The room ended while we were away (R16), or the server restarted (R17).
            leftRoom('closed');
          }
          return ack;
        },
        async leaveRoom() {
          const ack = await emit('room:leave', {});
          if (ack.ok) {
            set({ view: null });
          }
          return ack;
        },
        kick(playerId) {
          return emit('room:kick', { playerId });
        },
        updateSettings(settings) {
          return emit('room:updateSettings', { settings });
        },
        startMatch() {
          return emit('match:start', {});
        },
        abortMatch() {
          return emit('match:abort', {});
        },
        draftTheme(text) {
          return emit('theme:draft', { text });
        },
        submitTheme(text) {
          return emit('theme:submit', { text });
        },
        confirmReading(roundIndex) {
          return emit('round:ready', { roundIndex });
        },
        autosavePanel(roundIndex, png) {
          return emit('panel:autosave', { roundIndex, png });
        },
        submitPanel(roundIndex, reason, png) {
          return emit('panel:submit', { roundIndex, reason, png });
        },
        navigatePresentation(action) {
          return emit('presentation:navigate', action);
        },
        endPresentation() {
          return emit('presentation:end', {});
        },
      },
    };
  });
}

export const useRoomStore = createRoomStore({
  createSocketClient,
  renewSession: () => useSessionStore.getState().actions.renew(),
});

/** Actions need the socket: while it reconnects, buttons that send something are disabled. */
export function useOnline(): boolean {
  return useRoomStore((state) => state.connection === 'connected');
}
