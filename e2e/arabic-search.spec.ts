import { expect, test, type Locator } from '@playwright/test';

/** Taps on phones, clicks on desktop. */
const press = (el: Locator, isMobile: boolean) => (isMobile ? el.tap() : el.click());

test('roots: an inflected Quran word finds its root, with the Quran word shown', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox', { name: 'Search roots' });
  await expect(search).toBeVisible({ timeout: 15_000 });
  await search.fill('ظهورها');
  const first = page.getByRole('option').first();
  await expect(first.locator('.ar')).toHaveText('ظهر', { timeout: 15_000 });
  await expect(first).toContainText('ظُهُورِهَا');
});

test('verses: Arabic words search the Arabic text and mark the matched words', async ({ page, isMobile }, info) => {
  await page.goto('/');
  await expect(page.getByRole('combobox')).toBeVisible({ timeout: 15_000 });
  // Phones show "Roots | Verses" only while the field has focus.
  await press(page.getByRole('combobox'), isMobile);
  await press(page.getByRole('radio', { name: 'Verses' }), isMobile);
  const search = page.getByRole('combobox', { name: 'Search verses' });
  // Exact only: keeps the test free of the 36 MB model download (unit tests cover the hybrid mix).
  const gear = page.getByRole('button', { name: /search settings/i });
  await press(gear, isMobile);
  await press(page.getByRole('radio', { name: 'Exact' }), isMobile);
  await press(gear, isMobile);
  await search.fill('يسألونك');
  const hit = page.getByRole('option').filter({ hasText: '2:189' });
  await expect(hit).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('option').first()).toContainText('2:189');
  await expect(hit.locator('.verse-hit-ar mark').first()).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-arabic-verses.png` });
});
