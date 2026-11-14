import { expect, test, type Locator, type Page } from '@playwright/test';

// Long flows on software WebGL: give them room when the machine is busy.
test.describe.configure({ timeout: 120_000 });

const rootPanel = (page: Page) => page.getByLabel('Root details', { exact: true });
const versePanel = (page: Page) => page.getByLabel('Verse details', { exact: true });
const list = (page: Page) => page.getByRole('dialog', { name: 'Bookmarks' });
const rows = (page: Page) => list(page).getByRole('listitem');
const tabNames = (page: Page) => page.getByRole('tab').allTextContents();

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
  // Hold well past LONG_PRESS_MS: software rendering can delay the timer.
  await page.waitForTimeout(1500);
  // The press may have closed the list (tab switch): then there is nothing left to lift on.
  await target.dispatchEvent('pointerup', at, { timeout: 1000 }).catch(() => {});
}

async function openList(page: Page, isMobile: boolean) {
  await press(page.getByRole('button', { name: /^Bookmarks/ }), isMobile);
  await expect(list(page)).toBeVisible();
}

test('bookmark a root and a verse: list, open, new tab, reload', async ({ page, isMobile }, info) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  await expect(rootPanel(page).locator('.root-ar')).toHaveText('رحم', { timeout: 15_000 });
  const firstVerse = rootPanel(page).locator('.verse').first();
  await expect(firstVerse).toBeAttached({ timeout: 15_000 });
  const key = (await firstVerse.getAttribute('data-verse'))!;

  // Bookmark the root (header star) and its first verse (row star).
  await press(rootPanel(page).getByRole('button', { name: 'Bookmark رحم' }), isMobile);
  await expect(rootPanel(page).getByRole('button', { name: 'Bookmark رحم' })).toHaveAttribute('aria-pressed', 'true');
  const verseStar = firstVerse.getByRole('button', { name: `Bookmark verse ${key}` });
  await press(verseStar, isMobile);
  await expect(verseStar).toHaveAttribute('aria-pressed', 'true');

  // The list shows both, newest first.
  await openList(page, isMobile);
  await expect(rows(page)).toHaveCount(2);
  await expect(rows(page).nth(0)).toContainText(key);
  await expect(rows(page).nth(1)).toContainText('رحم');
  await page.waitForTimeout(800);
  await page.screenshot({ path: `test-results/${info.project.name}-bookmarks.png` });

  // A tap opens the verse in the current tab and closes the list.
  await press(list(page).getByRole('button', { name: `Open verse ${key}` }), isMobile);
  await expect(list(page)).toHaveCount(0);
  await expect(versePanel(page).getByRole('heading', { name: key })).toBeVisible();

  // The root opens in a new tab: background on desktop (middle-click), in front on touch.
  await openList(page, isMobile);
  const rootRow = list(page).getByRole('button', { name: 'Open رحم' });
  if (isMobile) {
    await longPress(page, rootRow);
    await expect(list(page)).toHaveCount(0);
    await expect(rootPanel(page).locator('.root-ar')).toHaveText('رحم');
  } else {
    await rootRow.click({ button: 'middle' });
    await expect(versePanel(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(list(page)).toHaveCount(0);
  }
  // The first tab still has رحم selected under the verse, so it keeps the root's label.
  await expect.poll(() => tabNames(page)).toEqual(['رحم', 'رحم']);

  // Bookmarks survive a reload.
  await page.reload();
  await expect(page.getByRole('combobox')).toBeVisible({ timeout: 15_000 });
  await openList(page, isMobile);
  await expect(rows(page)).toHaveCount(2);

  // Remove one.
  await press(list(page).getByRole('button', { name: 'Remove bookmark رحم' }), isMobile);
  await expect(rows(page)).toHaveCount(1);
});

test('a verse search result opens in a new tab', async ({ page, isMobile }) => {
  await page.goto('/');
  const box = page.getByRole('combobox');
  await expect(box).toBeVisible({ timeout: 15_000 });
  await press(page.getByRole('radio', { name: 'Verses' }), isMobile);
  await box.fill('mercy');
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
  // Pin the option by id: the list can still reorder while results arrive.
  const option = page.locator('#' + (await page.getByRole('option').first().getAttribute('id'))!);
  const key = (await option.locator('.verse-key').textContent())!;
  if (isMobile) {
    await longPress(page, option);
    await expect(versePanel(page).getByRole('heading', { name: key })).toBeVisible();
  } else {
    await option.click({ modifiers: ['ControlOrMeta'] });
    await expect(versePanel(page)).toHaveCount(0);
  }
  await expect.poll(() => tabNames(page)).toEqual(['“mercy”', key]);
});
