import { expect, type Locator, type Page } from '@playwright/test';

/** Phones: the tab counter in the search bar ("Tabs (N)"). */
export const tabCounter = (page: Page) => page.getByRole('button', { name: /^Tabs \(\d+\)$/ });
/** Phones: the tab switcher sheet. */
export const tabSheet = (page: Page) => page.getByRole('dialog', { name: 'Tabs' });

/**
 * Phones: presses a control in the counter or the sheet. A click event, not a real tap: with
 * software WebGL every Playwright tap waits about 6 s for frames, and these helpers run many.
 * The dedicated sheet test in tabs.spec.ts uses real taps.
 */
const press = (target: Locator) => target.dispatchEvent('click');

/** Phones: hides the keyboard focus from the search field, so the counter shows again. */
async function leaveSearch(page: Page) {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

/** Phones: opens the tab switcher sheet with the counter. */
export async function openSheet(page: Page) {
  await leaveSearch(page);
  await press(tabCounter(page));
  await expect(tabSheet(page)).toBeVisible();
}

/** Phones: closes the sheet with its × button. */
export async function closeSheet(page: Page) {
  await press(tabSheet(page).getByRole('button', { name: 'Close tab list' }));
  await expect(tabSheet(page)).toHaveCount(0);
}

/** Tab labels in order: the pills on desktop, the switcher rows on phones (no counter: no tabs). */
export async function tabNames(page: Page, isMobile: boolean): Promise<string[]> {
  if (!isMobile) return page.getByRole('tab', { includeHidden: true }).allTextContents();
  await leaveSearch(page);
  if ((await tabCounter(page).count()) === 0) return [];
  await openSheet(page);
  const names = await tabSheet(page).locator('.tab-row-label').allTextContents();
  await closeSheet(page);
  return names;
}

/** Switches to the tab with this label: a pill click on desktop, a row tap in the sheet on phones. */
export async function switchTab(page: Page, name: string, isMobile: boolean) {
  if (!isMobile) return page.getByRole('tab', { name, exact: true }).click();
  await openSheet(page);
  await press(tabSheet(page).getByRole('button', { name, exact: true }));
  await expect(tabSheet(page)).toHaveCount(0);
}

/** Opens an empty tab: "+" in the rail on desktop, "+ New tab" in the sheet on phones. */
export async function newTab(page: Page, isMobile: boolean) {
  if (!isMobile) return page.getByRole('navigation', { name: 'Tabs' }).getByRole('button', { name: 'New tab' }).click();
  await openSheet(page);
  await press(tabSheet(page).getByRole('button', { name: 'New tab' }));
  await expect(tabSheet(page)).toHaveCount(0);
}

/** Closes the tab with this label: its × (pill or sheet row). */
export async function closeTab(page: Page, name: string, isMobile: boolean) {
  if (!isMobile) return page.getByRole('button', { name: `Close tab ${name}` }).click();
  await openSheet(page);
  await press(tabSheet(page).getByRole('button', { name: `Close tab ${name}` }));
  // The sheet closes by itself when the last tab with content goes.
  if (await tabSheet(page).count()) await closeSheet(page);
}
