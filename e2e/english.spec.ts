import { expect, test } from '@playwright/test';

/** Screenshot path per project, e.g. test-results/android-english-panel.png. */
const shot = (project: string, name: string) => `test-results/${project}-english-${name}.png`;

test('English search finds roots by meaning: "light" shows نور first', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox');
  await search.fill('light');
  const first = page.getByRole('option').first();
  await expect(first).toContainText('نور', { timeout: 15_000 });
  await expect(first).toContainText('light');
});

test('English search: patience, sea and day', async ({ page }) => {
  await page.goto('/');
  const search = page.getByRole('combobox');
  for (const [query, root] of [
    ['patience', 'صبر'],
    ['sea', 'بحر'],
    ['day', 'يوم'],
  ] as const) {
    await search.fill(query);
    await expect(page.getByRole('option').first()).toContainText(root, { timeout: 15_000 });
  }
});

test('the root panel shows the meanings of the root and its lemmas', async ({ page }, info) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const panel = page.getByLabel('Root details', { exact: true });
  await expect(panel.getByLabel('Meanings')).toContainText('mercy', { timeout: 15_000 });
  await expect(panel.getByRole('list', { name: 'Lemmas' })).toContainText('merciful');
  // Let the camera settle before the screenshot used for the layout review.
  await page.waitForTimeout(2000);
  await page.screenshot({ path: shot(info.project.name, 'panel') });
});
