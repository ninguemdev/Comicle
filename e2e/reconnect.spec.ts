import { expect, test, type Browser } from '@playwright/test';

import { AUTOSAVE_INTERVAL_MS } from '../packages/shared/src/constants';
import { strings } from '../apps/web/src/strings/pt-BR';
import {
  canvasHasInk,
  confirmReading,
  drawingCanvas,
  drawSomething,
  finishDrawing,
  startReadingButton,
} from './support/game';
import { startTwoPlayerMatch } from './support/scenarios';

const texts = strings.match;
/** One autosave tick, plus the time to hand the PNG to the server. */
const AUTOSAVE_SETTLE_MS = AUTOSAVE_INTERVAL_MS + 1500;

test('R39, R48: recarregar no meio do desenho preserva o rascunho', async ({ browser }) => {
  const { host, guest } = await startTwoPlayerMatch(browser);
  const { page } = host;

  await drawSomething(page);
  expect(await canvasHasInk(page)).toBe(true);
  // The draft reaches the server only with the autosave (R39).
  await page.waitForTimeout(AUTOSAVE_SETTLE_MS);

  await page.reload();

  await expect(drawingCanvas(page)).toBeVisible();
  await expect.poll(() => canvasHasInk(page)).toBe(true);
  // The round goes on for the player who came back, and for the one who stayed.
  await finishDrawing(page);
  await finishDrawing(guest.page);
  await expect(startReadingButton(page)).toBeVisible();
});

/** Both players drew round one; the reading of round two (R35) is on, a few seconds in the fast profile. */
async function startReadingRound(browser: Browser) {
  const match = await startTwoPlayerMatch(browser);
  const players = [match.host, match.guest];
  await Promise.all(
    players.map(async ({ page }) => {
      await drawSomething(page);
      await finishDrawing(page);
    }),
  );
  await Promise.all(players.map(({ page }) => expect(startReadingButton(page)).toBeVisible()));
  return match;
}

test('R47: recarregar na leitura antes de confirmar mostra os quadros de novo', async ({
  browser,
}) => {
  const { host } = await startReadingRound(browser);

  await host.page.reload();

  await expect(host.page.locator('figure img')).toHaveCount(1);
  await expect(startReadingButton(host.page)).toBeVisible();
});

test('R47: recarregar na leitura depois de confirmar não mostra os quadros', async ({
  browser,
}) => {
  const { guest } = await startReadingRound(browser);
  await confirmReading(guest.page);
  await expect(guest.page.getByText(texts.prepare.message)).toBeVisible();

  await guest.page.reload();

  await expect(guest.page.getByText(texts.prepare.message)).toBeVisible();
  await expect(guest.page.locator('figure img')).toHaveCount(0);
  await expect(startReadingButton(guest.page)).toHaveCount(0);
});
