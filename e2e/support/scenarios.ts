import { expect, type Browser } from '@playwright/test';

import {
  createRoom,
  drawingCanvas,
  inviteLinkOf,
  joinRoom,
  startMatch,
  themeField,
  writeTheme,
} from './game';
import { strings } from '../../apps/web/src/strings/pt-BR';
import { createPlayer, type CreatePlayerOptions, type Player } from './player';

export interface TwoPlayerMatch {
  host: Player;
  guest: Player;
  roomCode: string;
}

/** A host and a guest in a started match, both with their themes in: round one is drawing (R34). */
export async function startTwoPlayerMatch(
  browser: Browser,
  options: {
    host?: CreatePlayerOptions;
    guest?: CreatePlayerOptions;
    /** R38: the host turns on the earlier panels while drawing before starting. */
    showPreviousPanels?: boolean;
  } = {},
): Promise<TwoPlayerMatch> {
  const host = await createPlayer(browser, 'Ana', options.host);
  const guest = await createPlayer(browser, 'Bruno', options.guest);
  const roomCode = await createRoom(host);
  await joinRoom(guest, await inviteLinkOf(host));
  if (options.showPreviousPanels === true) {
    // Controlled by the room view: it flips when the server answers, not on the click.
    const toggle = host.page.getByRole('checkbox', {
      name: strings.room.settings.showPreviousPanels,
    });
    await toggle.click();
    await expect(toggle).toBeChecked();
    await expect(guest.page.getByText(strings.room.settings.yes, { exact: true })).toBeVisible();
  }
  await startMatch(host);
  for (const player of [host, guest]) {
    await expect(themeField(player.page)).toBeVisible();
  }
  await Promise.all([
    writeTheme(host, 'Um dragão que tem medo de fogo'),
    writeTheme(guest, 'A primeira pizzaria da Lua'),
  ]);
  for (const player of [host, guest]) {
    await expect(drawingCanvas(player.page)).toBeVisible();
  }
  return { host, guest, roomCode };
}
