import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { PNG } from 'pngjs';

/** Screenshot path per project, e.g. test-results/android-intro-words.png. */
const shot = (info: TestInfo, name: string) => `test-results/${info.project.name}-${name}.png`;

/** The intro phase the scene writes on <body data-intro>. */
const phase = (page: Page) => page.evaluate(() => document.body.dataset.intro ?? '');

/**
 * Saves a full screenshot to `path` and counts lit pixels in its middle band
 * (away from the search and title bars).
 */
async function captureLit(page: Page, path: string): Promise<number> {
  const png = PNG.sync.read(await page.screenshot({ path }));
  let lit = 0;
  for (let y = Math.floor(png.height * 0.2); y < png.height * 0.8; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (Math.max(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!) > 80) lit++;
    }
  }
  return lit;
}

/** Number of root labels the declutter step currently shows. */
const shownLabels = (page: Page) =>
  page
    .locator('.label-layer > div')
    .evaluateAll((els) => els.filter((el) => (el as HTMLElement).style.opacity === '1').length);

// Automated browsers skip the intro (so other tests need not wait); `?intro` turns it back on.
// The software renderer in headless browsers draws a frame in about a second: poll, never assume timing.
test('stars form the words, then settle into the galaxy with labels', async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.goto('/?intro');
  await expect.poll(() => phase(page), { timeout: 30_000, intervals: [100] }).toBe('words');
  // No labels while the words show.
  expect(await shownLabels(page)).toBe(0);
  expect(await captureLit(page, shot(info, 'intro-words'))).toBeGreaterThan(500);

  // Slow renderers may step past the morph between two polls.
  await expect.poll(() => phase(page), { timeout: 30_000, intervals: [100] }).toMatch(/morph|done/);
  await expect.poll(() => phase(page), { timeout: 30_000 }).toBe('done');
  await expect.poll(() => shownLabels(page), { timeout: 15_000 }).toBeGreaterThan(5);
  await page.waitForTimeout(1500); // let the links fade in for the screenshot
  await page.screenshot({ path: shot(info, 'intro-galaxy') });
});

test('a tap or click during the intro finishes it quickly', async ({ page, isMobile }) => {
  await page.goto('/?intro');
  await expect.poll(() => phase(page), { timeout: 30_000, intervals: [100] }).toMatch(/appear|words/);
  const vp = page.viewportSize()!;
  if (isMobile) await page.touchscreen.tap(vp.width / 2, vp.height / 2);
  else await page.mouse.click(vp.width / 2, vp.height / 2);
  // A skip plays the rest of the morph in about one second of intro time.
  await expect.poll(() => phase(page), { timeout: 15_000 }).toBe('done');
  await expect.poll(() => shownLabels(page), { timeout: 15_000 }).toBeGreaterThan(5);
});

test('a deep link skips the intro', async ({ page }) => {
  await page.goto('/?intro#/root/' + encodeURIComponent('رحم'));
  await expect(page.getByLabel('Root details', { exact: true }).locator('.root-ar')).toHaveText('رحم');
  await expect.poll(() => phase(page), { timeout: 15_000 }).toBe('done');
  await expect.poll(() => shownLabels(page), { timeout: 15_000 }).toBeGreaterThan(0);
  // It never showed the words.
  expect(await page.evaluate(() => document.body.dataset.intro)).toBe('done');
});

test('reduced motion skips the intro', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?intro');
  await expect.poll(() => phase(page), { timeout: 15_000 }).toBe('done');
  await expect.poll(() => shownLabels(page), { timeout: 15_000 }).toBeGreaterThan(5);
});
