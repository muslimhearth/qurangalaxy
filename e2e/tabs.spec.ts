import { expect, test, type Locator, type Page } from '@playwright/test';

const panelRoot = (page: Page) => page.getByLabel('Root details', { exact: true }).locator('.root-ar');
const tabNames = (page: Page) => page.getByRole('tab').allTextContents();

/** Picks a root through the search field (Enter takes the best match). */
async function search(page: Page, text: string) {
  const box = page.getByRole('combobox');
  await box.fill(text);
  await box.press('Enter');
}

/** Clicks on desktop, taps on phones. */
async function press(target: Locator, isMobile: boolean) {
  if (isMobile) await target.tap();
  else await target.click();
}

/** Touch long-press: Playwright has no long-press gesture, so send the pointer events. */
async function longPress(page: Page, target: Locator) {
  const box = (await target.boundingBox())!;
  const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerType: 'touch', isPrimary: true, bubbles: true };
  await target.dispatchEvent('pointerdown', at);
  // Hold well past LONG_PRESS_MS: software rendering can delay the timer by over a second
  // (the first paint of the verse list is one long task).
  await page.waitForTimeout(2500);
  await target.dispatchEvent('pointerup', at);
}

test('two roots in two tabs: switch, reload, close', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox')).toBeVisible({ timeout: 15_000 });
  // One empty tab: the bar stays hidden.
  await expect(page.getByRole('tablist')).toHaveCount(0);

  await search(page, 'رحم');
  await expect(panelRoot(page)).toHaveText('رحم');
  expect(await tabNames(page)).toEqual(['رحم']);

  // + opens an empty tab and puts the cursor in the search field.
  await press(page.getByRole('button', { name: 'New tab' }), isMobile);
  await expect(page.getByRole('combobox')).toBeFocused();
  await expect(page.getByLabel('Root details', { exact: true })).toHaveCount(0);
  await search(page, 'علم');
  await expect(panelRoot(page)).toHaveText('علم');
  expect(await tabNames(page)).toEqual(['رحم', 'علم']);

  // Switching restores the root; the URL hash follows the active tab.
  await press(page.getByRole('tab', { name: 'رحم' }), isMobile);
  await expect(panelRoot(page)).toHaveText('رحم');
  await expect(page.getByRole('tab', { name: 'رحم' })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe('#/root/رحم');

  // Tabs and the active tab survive a reload.
  await page.reload();
  await expect(panelRoot(page)).toHaveText('رحم', { timeout: 15_000 });
  expect(await tabNames(page)).toEqual(['رحم', 'علم']);
  await expect(page.getByRole('tab', { name: 'رحم' })).toHaveAttribute('aria-selected', 'true');

  // Closing the active tab hands over to its neighbor.
  await press(page.getByRole('button', { name: 'Close tab رحم' }), isMobile);
  await expect(panelRoot(page)).toHaveText('علم');
  expect(await tabNames(page)).toEqual(['علم']);
});

test('a connected root opens in a new tab (Ctrl-click / long-press)', async ({ page, isMobile }, info) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  await expect(panelRoot(page)).toHaveText('رحم', { timeout: 15_000 });
  // Wait for the verses: the panel re-renders when they arrive, which would cancel an early long-press.
  await expect(page.locator('.verse').first()).toBeAttached({ timeout: 15_000 });
  const chips = page.getByRole('list', { name: 'Connected roots' }).locator('.chip-name');
  const first = chips.nth(0);
  const second = chips.nth(1);
  const firstAr = (await first.locator('[lang="ar"]').textContent())!;
  const secondAr = (await second.locator('[lang="ar"]').textContent())!;

  if (isMobile) {
    // Touch: the new tab opens in front.
    await longPress(page, first);
    await expect(panelRoot(page)).toHaveText(firstAr);
    expect(await tabNames(page)).toEqual(['رحم', firstAr]);
    await page.getByRole('tab', { name: 'رحم' }).tap();
    await expect(panelRoot(page)).toHaveText('رحم');
    await longPress(page, chips.nth(1));
    await expect(panelRoot(page)).toHaveText(secondAr);
    await page.getByRole('tab', { name: 'رحم' }).tap();
  } else {
    // Mouse: background tabs, in opening order; the current tab stays.
    await first.click({ modifiers: ['ControlOrMeta'] });
    await second.click({ button: 'middle' });
    await expect(panelRoot(page)).toHaveText('رحم');
  }
  await expect.poll(() => tabNames(page)).toEqual(isMobile ? ['رحم', secondAr, firstAr] : ['رحم', firstAr, secondAr]);
  await expect(panelRoot(page)).toHaveText('رحم');
  await page.waitForTimeout(2500); // let the camera settle for the screenshot
  await page.screenshot({ path: `test-results/${info.project.name}-tabs.png` });
});

test('tab pills sit next to the search bar and clear of the root panel', async ({ page, isMobile }, info) => {
  await page.goto('/');
  const box = page.getByRole('combobox');
  await expect(box).toBeVisible({ timeout: 15_000 });
  await search(page, 'رحم');
  await press(page.getByRole('button', { name: 'New tab' }), isMobile);
  await search(page, 'نور');
  await expect(page.getByRole('tab')).toHaveCount(2);

  const bar = (await page.locator('.search').boundingBox())!;
  const tabs = (await page.getByRole('tablist').boundingBox())!;
  const panel = (await page.getByLabel('Root details', { exact: true }).boundingBox())!;
  if (isMobile) {
    // One row under the search bar.
    expect(tabs.y).toBeGreaterThanOrEqual(bar.y + bar.height);
  } else {
    // Same row, to the right of the bar; the panel starts below the row.
    expect(tabs.x).toBeGreaterThanOrEqual(bar.x + bar.width);
    expect(Math.abs(tabs.y + tabs.height / 2 - (bar.y + bar.height / 2))).toBeLessThan(4);
    expect(panel.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    expect(panel.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
  }
  await page.screenshot({ path: `test-results/${info.project.name}-tab-pills.png` });
});
