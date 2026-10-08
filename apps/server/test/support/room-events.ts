import type { PlayerView, RoomRemovedReason } from '@comicle/shared';
import { vi } from 'vitest';

import type { TestClient } from './test-server';

const WAIT_OPTIONS = { timeout: 2000, interval: 10 };

/** Keeps every `room:view` a client receives, so a test can wait for the one it expects. */
export class ViewRecorder {
  private readonly views: PlayerView[] = [];

  constructor(client: TestClient) {
    client.on('room:view', (view) => {
      this.views.push(view);
    });
  }

  get latest(): PlayerView | undefined {
    return this.views.at(-1);
  }

  /** Resolves with the latest view as soon as it satisfies `predicate`. */
  waitFor(predicate: (view: PlayerView) => boolean): Promise<PlayerView> {
    return vi.waitFor(() => {
      const view = this.latest;
      if (!view || !predicate(view)) {
        throw new Error(`room:view esperada não chegou; última: ${JSON.stringify(view)}`);
      }
      return view;
    }, WAIT_OPTIONS);
  }
}

export function nextRoomRemoved(client: TestClient): Promise<{ reason: RoomRemovedReason }> {
  return new Promise((resolve) => {
    client.once('room:removed', resolve);
  });
}

export function nextSessionReplaced(client: TestClient): Promise<void> {
  return new Promise((resolve) => {
    client.once('session:replaced', () => {
      resolve();
    });
  });
}

export function nextDisconnect(client: TestClient): Promise<void> {
  return new Promise((resolve) => {
    client.once('disconnect', () => {
      resolve();
    });
  });
}

/** Waits until the server holds a timer whose key ends with `suffix`. */
export function waitForTimer(keys: () => string[], suffix: string): Promise<void> {
  return vi.waitFor(() => {
    if (!keys().some((key) => key.endsWith(suffix))) {
      throw new Error(`timer "${suffix}" não foi agendado`);
    }
  }, WAIT_OPTIONS);
}
