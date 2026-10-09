import { expect, test, type Page } from '@playwright/test';

import { MAX_PLAYERS } from '../packages/shared/src/constants';
import { strings } from '../apps/web/src/strings/pt-BR';
import { createRoom, inviteLinkOf, joinRoom, lobbyHeading } from './support/game';
import { createPlayer } from './support/player';

const texts = strings.room;

function problemHeading(page: Page, title: string) {
  return page.getByRole('heading', { name: title });
}

test('R12: o anfitrião expulsa um jogador, que não volta pelo convite', async ({ browser }) => {
  const ana = await createPlayer(browser, 'Ana');
  const bruno = await createPlayer(browser, 'Bruno');
  await createRoom(ana);
  const invite = await inviteLinkOf(ana);
  await joinRoom(bruno, invite);
  await expect(ana.page.getByRole('heading', { name: texts.players(2) })).toBeVisible();

  await ana.page.getByRole('button', { name: texts.kick('Bruno') }).click();
  await ana.page
    .getByRole('dialog', { name: texts.kickTitle })
    .getByRole('button', { name: texts.kickConfirm })
    .click();

  await expect(problemHeading(bruno.page, texts.problems.kicked.title)).toBeVisible();
  await expect(ana.page.getByRole('heading', { name: texts.players(1) })).toBeVisible();

  await bruno.page.goto(invite);
  await expect(problemHeading(bruno.page, texts.problems.kicked.title)).toBeVisible();
});

test('R9: a sala cheia recusa o próximo jogador', async ({ browser }) => {
  const ana = await createPlayer(browser, 'Ana');
  await createRoom(ana);
  const invite = await inviteLinkOf(ana);

  const others = await Promise.all(
    Array.from({ length: MAX_PLAYERS - 1 }, (_, index) =>
      createPlayer(browser, `Jogador ${String(index + 2)}`),
    ),
  );
  await Promise.all(others.map((player) => joinRoom(player, invite)));
  await expect(ana.page.getByRole('heading', { name: texts.players(MAX_PLAYERS) })).toBeVisible();

  const late = await createPlayer(browser, 'Atrasado');
  await late.page.goto(invite);

  await expect(problemHeading(late.page, texts.problems.full.title)).toBeVisible();
  await expect(lobbyHeading(late.page)).toHaveCount(0);
});

test('R6: um código inexistente mostra sala não encontrada', async ({ browser }) => {
  const ana = await createPlayer(browser, 'Ana');

  await ana.page.getByLabel(strings.home.codeLabel).fill('ZZZZZZ');
  await ana.page.getByRole('button', { name: strings.home.join, exact: true }).click();
  await expect(problemHeading(ana.page, texts.problems.notFound.title)).toBeVisible();

  // A malformed code in the URL gets the same answer.
  await ana.page.goto('/sala/abc');
  await expect(problemHeading(ana.page, texts.problems.notFound.title)).toBeVisible();
});
