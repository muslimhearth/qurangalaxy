import { expect, test } from '@playwright/test';

test('the bottom sheet minimizes to its header on phones', async ({ page, isMobile }, info) => {
  test.skip(!isMobile, 'bottom sheet only');
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const panel = page.getByLabel('Root details', { exact: true });
  await expect(panel.locator('.verse mark').first()).toBeVisible({ timeout: 15_000 });
  const vp = page.viewportSize()!;
  // Software rendering in headless browsers can starve the page for seconds, so polls get time.
  const height = () => panel.evaluate((el) => el.getBoundingClientRect().height);
  const full = await height();

  await page.getByRole('button', { name: 'Minimize root details' }).tap();
  // Only the header stays: a small strip at the bottom, the galaxy above it is free.
  await expect.poll(height, { timeout: 20_000 }).toBeLessThan(vp.height * 0.25);
  const box = (await panel.boundingBox())!;
  expect(box.y + box.height).toBeGreaterThan(vp.height - 2);
  await expect(panel.locator('.root-ar')).toHaveText('رحم');
  await page.waitForTimeout(2500); // let the camera re-center above the small sheet
  await page.screenshot({ path: `test-results/${info.project.name}-sheet-minimized.png` });

  // Tapping the minimized header (not only the button) opens it again.
  await panel.locator('.root-tr').tap();
  // Expanded again: a large sheet, as before (its exact height depends on scroll and loaded verses).
  await expect.poll(height, { timeout: 20_000 }).toBeGreaterThan(Math.min(full, vp.height * 0.4) - 1);
});

test('the bottom sheet maximizes below the search field and restores', async ({ page, isMobile }, info) => {
  test.skip(!isMobile, 'bottom sheet only');
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const panel = page.getByLabel('Root details', { exact: true });
  await expect(panel.locator('.verse mark').first()).toBeVisible({ timeout: 15_000 });
  const vp = page.viewportSize()!;
  const top = () => panel.evaluate((el) => el.getBoundingClientRect().top);
  await page.getByRole('button', { name: 'Maximize root details' }).tap();
  await expect.poll(top, { timeout: 20_000 }).toBeLessThan(vp.height * 0.15);
  // The search field stays usable above it.
  const search = (await page.getByRole('combobox').boundingBox())!;
  expect(search.y + search.height).toBeLessThanOrEqual((await top()) + 1);
  await page.screenshot({ path: `test-results/${info.project.name}-sheet-max.png` });
  await page.getByRole('button', { name: 'Restore root details' }).tap();
  await expect.poll(top, { timeout: 20_000 }).toBeGreaterThan(vp.height * 0.3);
});

test('desktop has no sheet size buttons', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop only');
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  await expect(page.getByLabel('Root details', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Minimize root details' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Maximize root details' })).toBeHidden();
});
