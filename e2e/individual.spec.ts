import { expect, test, type Page } from '@playwright/test';

import { strings } from '../apps/web/src/strings/pt-BR';
import {
  createRoom,
  drawingCanvas,
  drawSomething,
  finishedHeading,
  inviteLinkOf,
  joinRoom,
  presentationHeading,
  presentationNext,
  startMatch,
  themeField,
  writeTheme,
} from './support/game';
import { createPlayer } from './support/player';

const settings = strings.room.settings;
const story = strings.match.drawing.story;
const presentation = strings.match.presentation;
const PANELS = 2;

/** R65, R66: draws on every panel of the story, moving with the strip, then hands it in. */
async function drawWholeStory(page: Page): Promise<void> {
  for (let panel = 1; panel <= PANELS; panel++) {
    const button = page.getByRole('button', { name: story.panel(panel, PANELS) });
    await button.click();
    await expect(button).toHaveAttribute('aria-current', 'step');
    await drawSomething(page);
  }
  await page.getByRole('button', { name: story.submit, exact: true }).click();
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible()) {
    await dialog.getByRole('button', { name: story.confirm, exact: true }).click();
  }
}

test('R62–R68: partida individual de 2 jogadores, da escolha do modo ao fim da apresentação por tema', async ({
  browser,
}) => {
  const host = await createPlayer(browser, 'Ana');
  const guest = await createPlayer(browser, 'Bruno');
  await createRoom(host);
  await joinRoom(guest, await inviteLinkOf(host));

  // R21: the room view confirms each choice, so wait for it before the next one.
  const individual = host.page.getByRole('radio', {
    name: new RegExp(settings.modes.individual.name),
  });
  await individual.click();
  await expect(individual).toBeChecked();
  const panels = host.page.getByRole('combobox', { name: settings.panelsPerStory });
  await panels.selectOption(String(PANELS));
  await expect(panels).toHaveValue(String(PANELS));
  await expect(guest.page.getByText(settings.modes.individual.name)).toBeVisible();

  await startMatch(host);
  for (const player of [host, guest]) {
    await expect(themeField(player.page)).toBeVisible();
  }
  await Promise.all([
    writeTheme(host, 'Um dragão que tem medo de fogo'),
    writeTheme(guest, 'A primeira pizzaria da Lua'),
  ]);

  // R62, R65: one round, straight to drawing, a whole story each.
  for (const { page } of [host, guest]) {
    await expect(drawingCanvas(page)).toBeVisible();
    await expect(page.getByText(strings.match.storyOf(1, 1))).toBeVisible();
  }
  await Promise.all([drawWholeStory(host.page), drawWholeStory(guest.page)]);

  // R68: by theme; with 2 players each theme has one version, by the other player.
  await expect(presentationHeading(host.page)).toHaveText('Tema 1 de 2 · versão 1 de 1');
  await expect(guest.page.getByText(/^Versão 1 de 1 · desenhada por (Ana|Bruno)$/)).toBeVisible();
  for (let step = 0; step <= PANELS; step++) {
    await presentationNext(host);
  }
  await expect(host.page.locator('figure img')).toHaveCount(PANELS);
  await expect(guest.page.locator('figure img')).toHaveCount(PANELS);

  await host.page.getByRole('button', { name: presentation.nextTheme }).click();
  await expect(presentationHeading(guest.page)).toHaveText('Tema 2 de 2 · versão 1 de 1');
  await host.page.getByRole('button', { name: presentation.nextTheme }).click();
  await expect(finishedHeading(guest.page)).toBeVisible();
});
