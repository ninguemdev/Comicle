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
import { createPlayer } from './support/player';
import { createRoom, inviteLinkOf, joinRoom } from './support/game';

test('R2, R4: toque edita o personagem no celular sem transbordar a tela', async ({ browser }) => {
  const player = await createPlayer(browser, 'Ana', { context: { ...devices['Pixel 7'] } });
  const { page } = player;
  await page.goto('/perfil');
  await page.getByRole('tab', { name: 'Cabelo' }).click();
  await page.getByRole('button', { name: 'Despenteado' }).click();
  const preview = page.getByRole('img', { name: strings.avatar.preview });
  await preview.scrollIntoViewIfNeeded();
  const box = await preview.boundingBox();
  if (!box) throw new Error('prévia sem quadro');
  const cdp = await player.context.newCDPSession(page);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: x + 30, y: y + 20 }],
  });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const hair = preview.locator('[data-avatar-part="hair"]');
  await expect(hair).not.toHaveAttribute('style', /left: 0%; top: 0%/);
  const style = await hair.getAttribute('style');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: strings.profile.save }).click();
  await page.goto('/perfil');
  await expect(
    page.getByRole('img', { name: strings.avatar.preview }).locator('[data-avatar-part="hair"]'),
  ).toHaveAttribute('style', style ?? '');
  await page.goto('/');
  await createRoom(player);
  const guest = await createPlayer(browser, 'Bia', { context: { ...devices['Desktop Chrome'] } });
  await joinRoom(guest, await inviteLinkOf(player));
  await expect(
    guest.page
      .getByRole('img', { name: strings.avatar.of('Ana') })
      .locator('[data-avatar-part="hair"]'),
  ).toHaveAttribute('style', style ?? '');
  await page.reload();
  await expect(
    guest.page
      .getByRole('img', { name: strings.avatar.of('Ana') })
      .locator('[data-avatar-part="hair"]'),
  ).toHaveAttribute('style', style ?? '');
});

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
