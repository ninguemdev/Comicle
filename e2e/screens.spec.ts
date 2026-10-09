import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test';

import { strings } from '../apps/web/src/strings/pt-BR';
import { reviewScreen } from './support/a11y';
import {
  confirmReading,
  createRoom,
  drawingCanvas,
  drawSomething,
  finishDrawing,
  finishedHeading,
  inviteLinkOf,
  joinRoom,
  presentationHeading,
  presentationNext,
  startMatch,
  startReadingButton,
  themeField,
  writeTheme,
} from './support/game';
import { createPlayer, type Player } from './support/player';

const texts = strings.match;
/** From the first story's full page: the second story's theme, 2 panels, full page, then the end. */
const STEPS_TO_FINISH = 5;

interface Layout {
  name: string;
  width: number;
  height: number;
  colorScheme: 'light' | 'dark';
}

/** interface.md §6: the three sizes the game is reviewed in, plus dark mode once. */
const LAYOUTS: Layout[] = [
  { name: '360x640', width: 360, height: 640, colorScheme: 'light' },
  { name: '768x1024', width: 768, height: 1024, colorScheme: 'light' },
  { name: '1440x900', width: 1440, height: 900, colorScheme: 'light' },
  { name: '1440x900-escuro', width: 1440, height: 900, colorScheme: 'dark' },
];

async function playerIn(browser: Browser, nickname: string, layout: Layout): Promise<Player> {
  return createPlayer(browser, nickname, {
    context: {
      viewport: { width: layout.width, height: layout.height },
      colorScheme: layout.colorScheme,
      reducedMotion: 'reduce',
    },
  });
}

async function drawAndFinish(page: Page): Promise<void> {
  await drawSomething(page);
  await finishDrawing(page);
}

for (const layout of LAYOUTS) {
  test(`T21: todas as telas em ${layout.name} sem violações do axe nem rolagem lateral`, async ({
    browser,
  }, testInfo: TestInfo) => {
    const review = (page: Page, screen: string) =>
      reviewScreen(page, testInfo, `${layout.name}-${screen}`);
    const ana = await playerIn(browser, 'Ana', layout);
    const bruno = await playerIn(browser, 'Bruno', layout);
    const { page } = ana;

    await test.step('início, perfil e erros', async () => {
      await review(page, '01-inicio');
      await page.goto('/perfil');
      await review(page, '02-perfil');
      await page.goto('/pagina-que-nao-existe');
      await review(page, '03-pagina-nao-encontrada');
      await page.goto('/sala/0');
      await review(page, '04-sala-nao-encontrada');
      await page.goto('/');
    });

    await test.step('lobby', async () => {
      await createRoom(ana);
      await review(page, '05-lobby-sozinho');
      await joinRoom(bruno, await inviteLinkOf(ana));
      await expect(page.getByRole('heading', { name: strings.room.players(2) })).toBeVisible();
      await review(page, '06-lobby-anfitriao');
      await review(bruno.page, '07-lobby-convidado');
      await page.getByRole('button', { name: strings.room.kick('Bruno') }).click();
      await expect(page.getByRole('dialog', { name: strings.room.kickTitle })).toBeVisible();
      await review(page, '08-dialogo-expulsar');
      await page.keyboard.press('Escape');
      await startMatch(ana);
    });

    await test.step('temas', async () => {
      await expect(themeField(page)).toBeVisible();
      await review(page, '09-temas');
      await writeTheme(ana, 'Um dragão que tem medo de fogo');
      await expect(page.getByText(texts.waiting.received)).toBeVisible();
      await review(page, '10-espera-tema');
      await writeTheme(bruno, 'A primeira pizzaria da Lua');
    });

    await test.step('rodada 1: desenho e espera', async () => {
      await expect(drawingCanvas(page)).toBeVisible();
      await drawSomething(page);
      await review(page, '11-desenho');
      await finishDrawing(page);
      await expect(page.getByText(texts.waiting.received)).toBeVisible();
      await review(page, '12-espera-desenho');
      await drawAndFinish(bruno.page);
    });

    await test.step('rodada 2: leitura, preparação e desenho', async () => {
      await expect(startReadingButton(page)).toBeVisible();
      await review(page, '13-leitura');
      await confirmReading(page);
      await expect(page.getByText(texts.prepare.waiting)).toBeVisible();
      await review(page, '14-preparacao');
      await confirmReading(bruno.page);
      await expect(drawingCanvas(page)).toBeVisible();
      await Promise.all([drawAndFinish(page), drawAndFinish(bruno.page)]);
    });

    await test.step('apresentação', async () => {
      await expect(presentationHeading(page)).toBeVisible();
      await review(page, '15-apresentacao-tema');
      await review(bruno.page, '16-apresentacao-convidado');
      await presentationNext(ana);
      await expect(page.getByRole('img', { name: /^Quadro 1 de / }).first()).toBeVisible();
      await review(page, '17-apresentacao-quadro');
      await page.getByRole('button', { name: texts.presentation.showFull }).click();
      await expect(page.getByText(texts.presentation.full, { exact: true })).toBeVisible();
      await review(page, '18-apresentacao-hq-completa');
      // The second story: theme, its two panels, the full page, then the end.
      for (let step = 0; step < STEPS_TO_FINISH; step++) {
        await presentationNext(ana);
      }
      await expect(finishedHeading(page)).toBeVisible();
      await review(page, '19-fim');
    });
  });
}
