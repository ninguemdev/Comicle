import { devices, expect, test } from '@playwright/test';

import { strings } from '../apps/web/src/strings/pt-BR';
import {
  canvasHasInk,
  drawingCanvas,
  drawSomethingWithTouch,
  finishDrawing,
  startReadingButton,
} from './support/game';
import { startTwoPlayerMatch } from './support/scenarios';

test('desenha com toque no perfil de celular e envia o quadro', async ({ browser }) => {
  // The project's device is the phone; the guest is a regular desktop.
  const { host: phone, guest } = await startTwoPlayerMatch(browser, {
    guest: { context: { ...devices['Desktop Chrome'] } },
  });
  const { page } = phone;

  const canvas = drawingCanvas(page);
  const box = await canvas.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  // The editor fits the phone's screen: no sideways scroll, canvas inside the viewport.
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  await drawSomethingWithTouch(page);
  expect(await canvasHasInk(page)).toBe(true);

  await finishDrawing(page);
  await expect(page.getByText(strings.match.waiting.received)).toBeVisible();

  await finishDrawing(guest.page);
  await expect(startReadingButton(page)).toBeVisible();
});
