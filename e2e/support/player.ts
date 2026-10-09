import { randomInt } from 'node:crypto';

import type { Browser, BrowserContext, BrowserContextOptions, Page } from '@playwright/test';

import { strings } from '../../apps/web/src/strings/pt-BR';
import { BASE_URL } from './env';

const OCTET_RANGE = 254;

/** A private address nobody else in the run uses: the server rate-limits per IP (T19). */
function randomPrivateAddress(): string {
  const octet = () => String(1 + randomInt(OCTET_RANGE));
  return `10.${octet()}.${octet()}.${octet()}`;
}

/** One player: an isolated browser context, so its own `localStorage` and guest session. */
export interface Player {
  nickname: string;
  context: BrowserContext;
  page: Page;
}

export interface CreatePlayerOptions {
  /** Saves the profile right away (default). Without it the player has to meet R7's profile screen. */
  saveProfile?: boolean;
  /** Device emulation and the like, e.g. `devices['Pixel 7']`. */
  context?: BrowserContextOptions;
}

/** R4: a profile with a nickname, on the profile screen; the page then goes where `next` says. */
export async function fillProfile(page: Page, nickname: string): Promise<void> {
  await page.getByLabel(strings.profile.nicknameLabel).fill(nickname);
  await page.getByRole('button', { name: strings.profile.save }).click();
}

export async function createPlayer(
  browser: Browser,
  nickname: string,
  options: CreatePlayerOptions = {},
): Promise<Player> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    ...options.context,
    extraHTTPHeaders: { 'x-forwarded-for': randomPrivateAddress() },
  });
  const page = await context.newPage();
  const player: Player = { nickname, context, page };
  if (options.saveProfile ?? true) {
    await page.goto('/perfil');
    await fillProfile(page, nickname);
    await page.getByRole('button', { name: strings.home.createRoom }).waitFor();
  }
  return player;
}
