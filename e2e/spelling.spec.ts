import { expect, test } from '@playwright/test';

/** Latin spelling search (G7): typed transliterations find the right root first. */
test('typing a Latin spelling shows the right root first', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 15_000 });
  const search = page.getByRole('combobox');

  await search.fill('noor');
  await expect(page.getByRole('option').first()).toContainText('نور');

  // Chat alphabet: 3 = ع.
  await search.fill('3ilm');
  await expect(page.getByRole('option').first()).toContainText('علم');

  // Enter opens the first result.
  await search.fill('rahmaan');
  await search.press('Enter');
  await expect(page.getByLabel('Root details', { exact: true }).locator('.root-ar')).toHaveText('رحم');
});
