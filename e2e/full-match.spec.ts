import { expect, test } from '@playwright/test';

import { strings } from '../apps/web/src/strings/pt-BR';
import {
  canvasHasInk,
  confirmReading,
  createRoom,
  drawingCanvas,
  drawSomething,
  finishDrawing,
  finishedHeading,
  inviteLinkOf,
  joinRoom,
  lobbyHeading,
  openRoom,
  panelImages,
  presentationHeading,
  presentationNext,
  startMatch,
  themeField,
  writeTheme,
} from './support/game';
import { createPlayer, fillProfile, type Player } from './support/player';

const texts = strings.match;
const PLAYER_COUNT = 3;
const THEMES = [
  'Um dragão que tem medo de fogo',
  'A primeira pizzaria da Lua',
  'Um gato que vira prefeito da cidade',
];
/** Per story: theme, one step per panel, and the full page. */
const STEPS_PER_STORY = 1 + PLAYER_COUNT + 1;

async function drawAndFinish(player: Player): Promise<void> {
  await drawSomething(player.page);
  expect(await canvasHasInk(player.page)).toBe(true);
  await finishDrawing(player.page);
}

test('uma partida completa com 3 jogadores e 3 quadros', async ({ browser }) => {
  const ana = await createPlayer(browser, 'Ana');
  const bruno = await createPlayer(browser, 'Bruno');
  // Carla opens the invite without a profile and creates one on the way (R7).
  const carla = await createPlayer(browser, 'Carla', { saveProfile: false });
  const players = [ana, bruno, carla];

  await test.step('sala e convite', async () => {
    await createRoom(ana);
    const invite = await inviteLinkOf(ana);

    await joinRoom(bruno, invite);

    await openRoom(carla, invite);
    await expect(carla.page).toHaveURL(/\/perfil\?next=/);
    await fillProfile(carla.page, carla.nickname);
    await expect(lobbyHeading(carla.page)).toBeVisible();

    for (const player of players) {
      await expect(
        player.page.getByRole('heading', { name: strings.room.players(PLAYER_COUNT) }),
      ).toBeVisible();
    }
    await startMatch(ana);
  });

  await test.step('temas', async () => {
    await Promise.all(players.map((player) => expect(themeField(player.page)).toBeVisible()));
    await Promise.all(players.map((player, index) => writeTheme(player, THEMES[index] ?? '')));
  });

  await test.step('rodada 1: desenho sem leitura (R34)', async () => {
    await Promise.all(players.map((player) => expect(drawingCanvas(player.page)).toBeVisible()));
    await Promise.all(players.map(drawAndFinish));
  });

  for (let round = 2; round <= PLAYER_COUNT; round++) {
    await test.step(`rodada ${String(round)}: leitura e desenho`, async () => {
      const previousPanels = round - 1;
      await Promise.all(
        players.map(async ({ page }) => {
          // Only real images: a panel still loading is a placeholder, not a `figure img`.
          await expect(page.locator('figure img')).toHaveCount(previousPanels);
          await confirmReading(page);
          // R36: from "Começar a desenhar" on, the previous panels are gone from the screen.
          await expect(panelImages(page)).toHaveCount(0);
        }),
      );
      await Promise.all(players.map((player) => expect(drawingCanvas(player.page)).toBeVisible()));
      await Promise.all(players.map(drawAndFinish));
    });
  }

  await test.step('apresentação conduzida pelo anfitrião', async () => {
    for (const { page } of players) {
      await expect(presentationHeading(page)).toHaveText(
        texts.presentation.storyOf(1, PLAYER_COUNT),
      );
    }
    // R50–R52: the guests only follow.
    await expect(
      ana.page.getByRole('navigation', { name: texts.presentation.controls }),
    ).toBeVisible();
    await expect(bruno.page.getByText(texts.presentation.hostLeading)).toBeVisible();
    await expect(
      bruno.page.getByRole('navigation', { name: texts.presentation.controls }),
    ).toHaveCount(0);

    for (let story = 1; story <= PLAYER_COUNT; story++) {
      for (let step = 1; step < STEPS_PER_STORY; step++) {
        await presentationNext(ana);
      }
      // The last step of a story shows its whole page: every panel, for everyone.
      for (const { page } of players) {
        await expect(presentationHeading(page)).toHaveText(
          texts.presentation.storyOf(story, PLAYER_COUNT),
        );
        await expect(page.getByText(texts.presentation.full, { exact: true })).toBeVisible();
        await expect(page.locator('figure img')).toHaveCount(PLAYER_COUNT);
      }
      await presentationNext(ana);
    }

    for (const { page } of players) {
      await expect(finishedHeading(page)).toBeVisible();
    }
    await expect(bruno.page.getByText(texts.presentation.finishedWaiting)).toBeVisible();
  });

  await test.step('nova partida volta ao lobby', async () => {
    await ana.page.getByRole('button', { name: texts.presentation.newMatch }).click();
    for (const { page } of players) {
      await expect(lobbyHeading(page)).toBeVisible();
    }
    await expect(ana.page.getByRole('button', { name: strings.room.start })).toBeEnabled();
  });
});
