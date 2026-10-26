import { expect, test } from '@playwright/test';

import { strings } from '../apps/web/src/strings/pt-BR';
import { createRoom, inviteLinkOf, joinRoom } from './support/game';
import { createPlayer } from './support/player';

test('R2, R4, R9: editar, salvar, transmitir e reconectar conserva o personagem', async ({
  browser,
}) => {
  const host = await createPlayer(browser, 'Ana');
  const guest = await createPlayer(browser, 'Bia');
  const { page } = host;
  await page.goto('/perfil');
  expect(await page.getByRole('tab', { name: 'Cabeça' }).count()).toBe(0);
  await page.getByRole('tab', { name: 'Cabelo' }).click();
  await page.getByRole('button', { name: 'Despenteado' }).click();
  const size = page.getByRole('slider', { name: strings.avatar.size });
  await size.focus();
  await size.press('ArrowRight');
  await expect(size).toHaveValue('101');
  const preview = page.getByRole('img', { name: strings.avatar.preview });
  const box = await preview.boundingBox();
  if (!box) throw new Error('prévia sem quadro');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.45, { steps: 6 });
  await page.mouse.up();
  const hair = preview.locator('[data-avatar-part="hair"]');
  const style = await hair.getAttribute('style');
  expect(style).toContain('width: 101%');
  expect(style).not.toContain('left: 0%');
  await page.getByRole('button', { name: strings.profile.save }).click();
  await page.goto('/perfil');
  await expect(
    page.getByRole('img', { name: strings.avatar.preview }).locator('[data-avatar-part="hair"]'),
  ).toHaveAttribute('style', style ?? '');
  await page.goto('/');
  await createRoom(host);
  await joinRoom(guest, await inviteLinkOf(host));
  const remote = guest.page.getByRole('img', { name: strings.avatar.of('Ana') });
  await expect(remote.locator('[data-avatar-part="hair"]')).toHaveAttribute('style', style ?? '');
  await page.reload();
  await expect(
    guest.page
      .getByRole('img', { name: strings.avatar.of('Ana') })
      .locator('[data-avatar-part="hair"]'),
  ).toHaveAttribute('style', style ?? '');
});
