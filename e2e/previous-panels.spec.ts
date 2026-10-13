import { expect, test } from '@playwright/test';

import { strings } from '../apps/web/src/strings/pt-BR';
import { confirmReading, drawingCanvas, drawSomething, finishDrawing } from './support/game';
import { startTwoPlayerMatch } from './support/scenarios';

const REFERENCE = strings.match.drawing.previousPanels;

test('R38: com a opção ligada, o desenho mostra os quadros anteriores, inclusive depois de recarregar', async ({
  browser,
}) => {
  const { host, guest } = await startTwoPlayerMatch(browser, { showPreviousPanels: true });

  // Round 1 has nothing before it.
  await expect(host.page.getByRole('list', { name: REFERENCE })).toHaveCount(0);
  for (const { page } of [host, guest]) {
    await drawSomething(page);
    await finishDrawing(page);
  }

  await confirmReading(host.page);
  await expect(drawingCanvas(host.page)).toBeVisible();
  const reference = host.page.getByRole('list', { name: REFERENCE });
  // A real image, not the placeholder of a panel still loading.
  await expect(reference.locator('figure img')).toHaveCount(1);

  await host.page.reload();

  await expect(drawingCanvas(host.page)).toBeVisible();
  await expect(host.page.getByRole('list', { name: REFERENCE }).locator('figure img')).toHaveCount(
    1,
  );
});
