import { useRoomStore } from './stores/room-store';
import { useSessionStore } from './stores/session-store';

/** Client boot (arquitetura §5): session, then socket; the socket measures the clock offset. */
export async function bootAndConnect(): Promise<void> {
  const token = await useSessionStore.getState().actions.boot();
  if (token !== null) {
    useRoomStore.getState().actions.connect(token);
  }
}
