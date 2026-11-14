import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

/** Screenshot path per project, e.g. test-results/android-verse-results.png. */
const shot = (info: TestInfo, name: string) => `test-results/${info.project.name}-${name}.png`;

/** Taps on phones, clicks on desktop. */
const press = (el: Locator, isMobile: boolean) => (isMobile ? el.tap() : el.click());

/** Opens the app in verse mode with the exact-only mix (no model download needed). */
async function verseMode(page: Page, isMobile: boolean) {
  await page.goto('/');
  const search = page.getByRole('combobox');
  await expect(search).toBeVisible({ timeout: 15_000 });
  await press(page.getByRole('radio', { name: 'Verses' }), isMobile);
  await expect(page.getByRole('combobox', { name: 'Search verses' })).toBeVisible();
  // Exact words only: keeps the test fast and free of the 36 MB model download.
  await press(page.getByRole('button', { name: /search mode/i }), isMobile);
  const slider = page.getByRole('slider', { name: /search mode/i });
  await slider.fill('0');
  await expect(slider).toHaveAttribute('aria-valuetext', 'Exact only');
  await press(page.getByRole('button', { name: /search mode/i }), isMobile);
  return search;
}

test('an English phrase finds its verse; the verse panel links to its roots', async ({ page, isMobile }, info) => {
  const search = await verseMode(page, isMobile);
  await search.fill('seek help through patience and prayer');
  const first = page.getByRole('option').first();
  await expect(first).toContainText('2:45', { timeout: 15_000 });
  await expect(first.locator('mark').first()).toBeVisible();
  await expect(page.getByRole('option').nth(1)).toContainText('2:153');
  await page.screenshot({ path: shot(info, 'verse-results') });

  await press(page.getByRole('option').filter({ hasText: '2:153' }), isMobile);
  const panel = page.getByLabel('Verse details', { exact: true });
  await expect(panel.locator('.verse-title')).toHaveText('2:153');
  await expect(panel.locator('.verse-en')).toContainText('seek help through patience and prayer');
  await expect(panel.locator('.verse-tr')).toContainText('Ya ayyuha');
  await expect(panel.locator('.verse-ar')).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/verse/2:153');
  await page.screenshot({ path: shot(info, 'verse-panel') });

  // A root chip shows that root in the galaxy.
  const chip = panel.getByRole('button').filter({ hasText: 'صبر' });
  if (isMobile) {
    // A real touch at the chip. (locator.tap() hangs here: the chip unmounts during the tap.)
    const box = (await chip.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  } else await chip.click();
  const rootPanel = page.getByLabel('Root details', { exact: true });
  await expect(rootPanel.locator('.root-ar')).toHaveText('صبر');
  await expect(page.getByLabel('Verse details', { exact: true })).toHaveCount(0);
  expect(decodeURIComponent(new URL(page.url()).hash)).toBe('#/root/صبر');
});

test('transliteration finds a verse and is marked in the result', async ({ page, isMobile }) => {
  const search = await verseMode(page, isMobile);
  await search.fill('qul huwa allahu ahad');
  const first = page.getByRole('option').first();
  await expect(first).toContainText('112:1', { timeout: 15_000 });
  await expect(first.locator('.verse-hit-tr mark').first()).toBeVisible();
});

test('"3:109" opens the verse in any mode; back and forward follow it', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox', { name: 'Search roots' });
  await search.fill('1:8');
  await expect(page.getByText('No verse 1:8. Surah 1 has 7 verses.')).toBeVisible();
  await search.fill('115:1');
  await expect(page.getByText('No surah 115. There are 114 surahs.')).toBeVisible();

  await search.fill('3 109');
  await search.press('Enter');
  const panel = page.getByLabel('Verse details', { exact: true });
  await expect(panel.locator('.verse-title')).toHaveText('3:109');
  await expect(panel.locator('.verse-en')).toContainText('To Allah belongs whatever is in the heavens');
  expect(new URL(page.url()).hash).toBe('#/verse/3:109');

  await page.goBack();
  await expect(panel).toHaveCount(0);
  await page.goForward();
  await expect(panel.locator('.verse-title')).toHaveText('3:109');
});

test('a #/verse/ deep link opens the verse panel', async ({ page }) => {
  await page.goto('/#/verse/2:255');
  const panel = page.getByLabel('Verse details', { exact: true });
  await expect(panel.locator('.verse-title')).toHaveText('2:255', { timeout: 15_000 });
  await expect(panel.getByRole('list', { name: 'Roots in this verse' }).getByRole('button').first()).toBeVisible();
});

test('search history: recorded on Enter, shown on focus, rerun, removed, kept after reload', async ({ page, isMobile }) => {
  await page.goto('/');
  const search = page.getByRole('combobox');
  await search.fill('rhm');
  await search.press('Enter');
  await expect(page.getByLabel('Root details', { exact: true })).toBeVisible();

  await page.reload();
  await press(search, isMobile);
  const history = page.locator('.search-history');
  await expect(history.getByRole('button', { name: /^rhm/ })).toBeVisible();
  await press(history.getByRole('button', { name: /^rhm/ }), isMobile);
  await expect(search).toHaveValue('rhm');
  await expect(page.getByRole('option').first()).toContainText('رحم');

  await search.fill('');
  await press(history.getByRole('button', { name: 'Remove "rhm" from history' }), isMobile);
  await expect(history).toHaveCount(0);
});

test('the search field has focus on desktop only', async ({ page, isMobile }) => {
  await page.goto('/');
  const search = page.getByRole('combobox');
  await expect(search).toBeVisible({ timeout: 15_000 });
  if (isMobile) await expect(search).not.toBeFocused();
  else await expect(search).toBeFocused();
});
