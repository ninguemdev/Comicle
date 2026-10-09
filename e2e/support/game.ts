import { expect, type Locator, type Page } from '@playwright/test';

import { strings } from '../../apps/web/src/strings/pt-BR';
import type { Player } from './player';

const texts = strings.match;
const ROOM_CODE_PATH = /\/sala\/([A-Z0-9]{6})$/;
const ROUND_LABEL = /^Quadro \d+ de \d+$/;
const PANEL_IMAGE = /^Quadro \d+ de /;
const POLL_INTERVAL_MS = 100;
const ADVANCE_TIMEOUT_MS = 60_000;
const CONFIRM_DIALOG_TIMEOUT_MS = 2000;
const STROKE_STEPS = 12;

export type Phase = 'lobby' | 'theme_writing' | 'round_reading' | 'round_drawing' | 'presentation';

// ── Locators ────────────────────────────────────────────────────────────────

export function lobbyHeading(page: Page): Locator {
  return page.getByRole('heading', { name: /^Sala [A-Z0-9]{6}$/ });
}

export function themeField(page: Page): Locator {
  return page.getByRole('textbox', { name: texts.theme.label });
}

export function startReadingButton(page: Page): Locator {
  return page.getByRole('button', { name: texts.reading.start });
}

export function drawingCanvas(page: Page): Locator {
  return page.getByRole('img', { name: strings.drawing.canvas });
}

/** The panels of the story being read (R36); not the drawing canvas. */
export function panelImages(page: Page): Locator {
  return page.getByRole('img', { name: PANEL_IMAGE });
}

export function presentationHeading(page: Page): Locator {
  return page.getByRole('heading', { name: /^História \d+ de \d+$/ });
}

export function finishedHeading(page: Page): Locator {
  return page.getByRole('heading', { name: texts.presentation.finished });
}

/** "Quadro 2 de 3": which round the screen is in (the drawing header and the match header). */
function roundLabel(page: Page): Locator {
  return page.getByText(ROUND_LABEL).first();
}

// ── Lobby ───────────────────────────────────────────────────────────────────

export function roomCodeOf(page: Page): string {
  const code = ROOM_CODE_PATH.exec(new URL(page.url()).pathname)?.[1];
  if (code === undefined) {
    throw new Error(`Not on a room page: ${page.url()}`);
  }
  return code;
}

/** Creates a room from the start screen; the player ends in its lobby as host. */
export async function createRoom(host: Player): Promise<string> {
  const { page } = host;
  await page.getByRole('button', { name: strings.home.createRoom }).click();
  await expect(lobbyHeading(page)).toBeVisible();
  return roomCodeOf(page);
}

/** The invite link, as the host copies it (T09). */
export async function inviteLinkOf(host: Player): Promise<string> {
  return host.page.getByLabel(strings.room.inviteLabel).inputValue();
}

/** Opens an invite link or a room URL; a player without a profile passes the profile screen first. */
export async function openRoom(player: Player, link: string): Promise<void> {
  await player.page.goto(link);
}

export async function joinRoom(player: Player, link: string): Promise<void> {
  await openRoom(player, link);
  await expect(lobbyHeading(player.page)).toBeVisible();
}

export async function startMatch(host: Player): Promise<void> {
  await host.page.getByRole('button', { name: strings.room.start }).click();
}

// ── Themes ──────────────────────────────────────────────────────────────────

export async function writeTheme(player: Player, theme: string): Promise<void> {
  await themeField(player.page).fill(theme);
  await player.page.getByRole('button', { name: texts.theme.submit }).click();
}

// ── Reading ─────────────────────────────────────────────────────────────────

export async function confirmReading(page: Page): Promise<void> {
  await startReadingButton(page).click();
}

// ── Drawing ─────────────────────────────────────────────────────────────────

/** A stroke across the canvas with the mouse. */
export async function drawSomething(page: Page): Promise<void> {
  const canvas = drawingCanvas(page);
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error('The drawing canvas has no box');
  }
  const startX = box.x + box.width * 0.2;
  const endX = box.x + box.width * 0.8;
  const midY = box.y + box.height / 2;
  await page.mouse.move(startX, midY);
  await page.mouse.down();
  for (let step = 1; step <= STROKE_STEPS; step++) {
    const progress = step / STROKE_STEPS;
    const wave = Math.sin(progress * Math.PI * 2) * box.height * 0.2;
    await page.mouse.move(startX + (endX - startX) * progress, midY + wave);
  }
  await page.mouse.up();
}

/** Whether the visible canvas has any pixel different from its corner (the blank paper). */
export async function canvasHasInk(page: Page): Promise<boolean> {
  return drawingCanvas(page).evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      return false;
    }
    const context = element.getContext('2d');
    if (context === null) {
      return false;
    }
    const { data } = context.getImageData(0, 0, element.width, element.height);
    const pixel = (offset: number) =>
      `${String(data[offset])},${String(data[offset + 1])},${String(data[offset + 2])},${String(data[offset + 3])}`;
    const paper = pixel(0);
    for (let offset = 4; offset < data.length; offset += 4) {
      if (pixel(offset) !== paper) {
        return true;
      }
    }
    return false;
  });
}

/** "Concluir"; answers the "Concluir agora?" dialog when there is still time left (R40). */
export async function finishDrawing(page: Page): Promise<void> {
  await page.getByRole('button', { name: texts.drawing.submit, exact: true }).click();
  const dialog = page.getByRole('dialog');
  const asked = await dialog
    .waitFor({ state: 'visible', timeout: CONFIRM_DIALOG_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  if (asked) {
    await dialog.getByRole('button', { name: texts.drawing.confirm, exact: true }).click();
  }
}

// ── Presentation ────────────────────────────────────────────────────────────

export async function presentationNext(host: Player): Promise<void> {
  await host.page.getByRole('button', { name: texts.presentation.next }).click();
}

// ── Following the match ─────────────────────────────────────────────────────

async function currentPhase(page: Page): Promise<Phase | null> {
  if (await lobbyHeading(page).isVisible()) {
    return 'lobby';
  }
  if (await themeField(page).isVisible()) {
    return 'theme_writing';
  }
  if (await startReadingButton(page).isVisible()) {
    return 'round_reading';
  }
  if (
    (await drawingCanvas(page).isVisible()) &&
    (await page.getByRole('button', { name: texts.drawing.submit, exact: true }).isEnabled())
  ) {
    return 'round_drawing';
  }
  if ((await presentationHeading(page).isVisible()) || (await finishedHeading(page).isVisible())) {
    return 'presentation';
  }
  return null;
}

/** What each player already did in the match, so a screen that lingers is not answered twice. */
const answered = new WeakMap<Page, Set<string>>();

async function answerOnce(page: Page, key: string, act: () => Promise<void>): Promise<void> {
  const seen = answered.get(page) ?? new Set<string>();
  answered.set(page, seen);
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  await act();
}

/**
 * Plays for the player — a theme, a read, a drawing — until the screen of `target` shows.
 * Screens that wait for others are just waited out.
 */
export async function advanceUntilPhase(player: Player, target: Phase): Promise<void> {
  const { page } = player;
  const deadline = Date.now() + ADVANCE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const phase = await currentPhase(page);
    if (phase === target) {
      return;
    }
    switch (phase) {
      case 'theme_writing':
        await answerOnce(page, 'theme', () => writeTheme(player, `Tema de ${player.nickname}`));
        break;
      case 'round_reading':
        await answerOnce(page, `reading:${(await roundLabel(page).textContent()) ?? ''}`, () =>
          confirmReading(page),
        );
        break;
      case 'round_drawing':
        await answerOnce(
          page,
          `drawing:${(await roundLabel(page).textContent()) ?? ''}`,
          async () => {
            await drawSomething(page);
            await finishDrawing(page);
          },
        );
        break;
      case 'lobby':
      case 'presentation':
      case null:
        break;
      default:
        phase satisfies never;
    }
    await page.waitForTimeout(POLL_INTERVAL_MS);
  }
  throw new Error(`${player.nickname} did not reach ${target} in ${String(ADVANCE_TIMEOUT_MS)} ms`);
}

/** A stroke with a finger: Playwright's touchscreen only taps, so the touches go through CDP. */
export async function drawSomethingWithTouch(page: Page): Promise<void> {
  const canvas = drawingCanvas(page);
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error('The drawing canvas has no box');
  }
  const session = await page.context().newCDPSession(page);
  const touchAt = (progress: number) => [
    {
      x: box.x + box.width * (0.2 + 0.6 * progress),
      y: box.y + box.height * (0.5 + 0.2 * Math.sin(progress * Math.PI * 2)),
    },
  ];
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchAt(0) });
  for (let step = 1; step <= STROKE_STEPS; step++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: touchAt(step / STROKE_STEPS),
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}
