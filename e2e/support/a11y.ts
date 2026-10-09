import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

/** WCAG 2.1 A and AA: what interface.md §6 asks for (contrast AA, names, roles, language). */
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
/** T21: no critical or serious violation; moderate and minor ones are reviewed by hand. */
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

/** Runs axe on the page as it is now and fails on any critical or serious violation. */
export async function expectNoSeriousA11yViolations(page: Page, screen: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const blocking = results.violations
    .filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''))
    .map((violation) => ({
      rule: violation.id,
      impact: violation.impact,
      help: violation.help,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }));
  expect(blocking, `axe em "${screen}"`).toEqual([]);
}

/** Nothing wider than the viewport (T21: no sideways scroll at 360px). */
export async function expectNoHorizontalScroll(page: Page, screen: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `rolagem horizontal em "${screen}"`).toBeLessThanOrEqual(0);
}

/** A full-page capture attached to the report (the PR links the CI report). */
export async function captureScreen(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

/** More stops than any screen has; past it the walk stops even if focus never cycles back. */
const MAX_TAB_STOPS = 60;

interface FocusStop {
  /** Role and accessible name, enough to read the order in the report. */
  label: string;
  /** Whether the stop shows a focus ring (its own, or its label's for a visually hidden input). */
  visible: boolean;
}

/** The focused element as a stop; `null` when focus is on the page itself. */
async function focusStop(page: Page): Promise<FocusStop | null> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) {
      return null;
    }
    const ringOf = (element: Element) => {
      const style = getComputedStyle(element);
      return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
    };
    const label = active.closest('label');
    const name =
      active.getAttribute('aria-label') ?? (label ?? active).textContent.trim().slice(0, 40);
    const role = active.getAttribute('role') ?? active.tagName.toLowerCase();
    return {
      label: `${role} "${name}"`,
      visible: ringOf(active) || (label !== null && ringOf(label)),
    };
  });
}

/**
 * Tabs through the whole screen (interface.md §6): every stop shows the focus ring. The order is
 * attached to the report, to be read by a person.
 */
export async function expectVisibleFocusOnTab(
  page: Page,
  testInfo: TestInfo,
  screen: string,
): Promise<void> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });
  const stops: FocusStop[] = [];
  for (let index = 0; index < MAX_TAB_STOPS; index++) {
    await page.keyboard.press('Tab');
    const stop = await focusStop(page);
    if (stop === null || stops[0]?.label === stop.label) {
      break;
    }
    stops.push(stop);
  }
  await testInfo.attach(`${screen}-foco.txt`, {
    body: stops.map((stop, index) => `${String(index + 1)}. ${stop.label}`).join('\n'),
    contentType: 'text/plain',
  });
  expect(
    stops.filter((stop) => !stop.visible).map((stop) => stop.label),
    `foco invisível em "${screen}"`,
  ).toEqual([]);
}

/** The checks of every screen in the a11y spec. */
export async function reviewScreen(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await expectNoSeriousA11yViolations(page, name);
  await expectNoHorizontalScroll(page, name);
  await captureScreen(page, testInfo, name);
  await expectVisibleFocusOnTab(page, testInfo, name);
}
