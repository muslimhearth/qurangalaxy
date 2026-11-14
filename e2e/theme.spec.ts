import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { PNG } from 'pngjs';

/** Screenshot path per project; SHOT_DIR moves them out of test-results. */
const shot = (info: TestInfo, name: string) => `${process.env.SHOT_DIR ?? 'test-results'}/${info.project.name}-${name}.png`;
// Software rendering makes every frame slow.
test.slow();

const theme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme);
const themeColor = (page: Page) =>
  page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute('content'));

/** Relative luminance (0 dark .. 1 light) of an element's computed background color. */
const backgroundLuminance = (target: Locator) =>
  target.evaluate((el) => {
    const [r, g, b] = getComputedStyle(el).backgroundColor.match(/[\d.]+/g)!.map(Number);
    return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255;
  });

/** Shares of dark and of pale pixels in the middle band of the screen, where only the galaxy shows. */
async function skyShares(page: Page): Promise<{ dark: number; pale: number }> {
  const vp = page.viewportSize()!;
  const clip = { x: 0, y: vp.height * 0.3, width: vp.width, height: vp.height * 0.35 };
  const png = PNG.sync.read(await page.screenshot({ clip }));
  let dark = 0;
  let pale = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const [r, g, b] = [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!];
    if (Math.max(r, g, b) < 60) dark++;
    // A light page color (all channels high), unlike the gold and blue star glow.
    if (Math.min(r, g, b) > 200) pale++;
  }
  const n = png.data.length / 4;
  return { dark: dark / n, pale: pale / n };
}

/** Clicks on desktop, taps on phones. */
async function press(target: Locator, isMobile: boolean) {
  if (isMobile) await target.tap();
  else await target.click();
}

const gear = (page: Page) => page.getByRole('button', { name: /search settings/i });

test('light theme: panels turn light, the galaxy stays dark, a reload keeps it', async ({ page, isMobile }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  expect(await theme(page)).toBe('dark');

  await press(gear(page), isMobile);
  const settings = page.getByRole('dialog', { name: 'Search settings' });
  await expect(settings.getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
  await press(settings.getByRole('radio', { name: 'Light' }), isMobile);
  expect(await theme(page)).toBe('light');
  expect(await themeColor(page)).toBe('#f3ede0');
  expect(await backgroundLuminance(settings)).toBeGreaterThan(0.9);
  await page.keyboard.press('Escape');
  await expect(settings).toHaveCount(0);

  // Stars are glow on a dark sky in both themes.
  // The phone galaxy's bright core fills much of the band, hence the low dark share.
  await expect.poll(async () => (await skyShares(page)).dark, { timeout: 15_000 }).toBeGreaterThan(0.3);
  expect((await skyShares(page)).pale).toBeLessThan(0.1);

  await page.goto('/#/root/' + encodeURIComponent('نور'));
  await page.reload();
  expect(await theme(page)).toBe('light');
  const panel = page.getByRole('complementary', { name: 'Root details' });
  await expect(panel).toBeVisible();
  expect(await backgroundLuminance(panel)).toBeGreaterThan(0.9);
  expect(await backgroundLuminance(page.locator('body'))).toBeLessThan(0.05);
});

test('"System" follows the device setting live', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  expect(await theme(page)).toBe('light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => theme(page)).toBe('dark');
  expect(await themeColor(page)).toBe('#04050b');
});

for (const name of ['light', 'dark'] as const) {
  test(`screenshots: ${name} theme`, async ({ page, isMobile }, info) => {
    await page.addInitScript((t) => localStorage.setItem('qrg.theme.v1', t), name);
    await page.goto('/#/root/' + encodeURIComponent('نور'));
    await expect(page.locator('.verse').first()).toBeVisible({ timeout: 15_000 });
    expect(await theme(page)).toBe(name);
    await page.screenshot({ path: shot(info, `${name}-root`) });

    await press(gear(page), isMobile);
    await expect(page.getByRole('dialog', { name: 'Search settings' })).toBeVisible();
    await page.screenshot({ path: shot(info, `${name}-settings`) });
    await page.keyboard.press('Escape');

    await press(page.getByRole('button', { name: 'Read 2:17 in its surah' }), isMobile);
    const reader = page.getByRole('complementary', { name: 'Surah reader' });
    await expect(reader.locator('[aria-current="true"]')).toBeInViewport();
    await page.screenshot({ path: shot(info, `${name}-reader`) });
  });
}

test('text size: XL makes verse text larger, Arabic more than English, and a reload keeps it', async ({ page, isMobile }) => {
  await page.goto('/#/surah/16/1');
  const verse = page.locator('.reader-verses .verse').first();
  await expect(verse.locator('.verse-ar')).toBeVisible({ timeout: 15_000 });
  const size = (sel: string) => verse.locator(sel).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const chrome = () => page.locator('.reader-nav button').first().evaluate((el) => getComputedStyle(el).fontSize);
  const [ar, en, ui] = [await size('.verse-ar'), await size('.verse-en'), await chrome()];
  expect(await page.evaluate(() => document.documentElement.dataset.textSize)).toBe('M');

  await press(gear(page), isMobile);
  const settings = page.getByRole('dialog', { name: 'Search settings' });
  await expect(settings.getByRole('radio', { name: 'Medium' })).toHaveAttribute('aria-checked', 'true');
  await press(settings.getByRole('radio', { name: 'Extra large' }), isMobile);
  const arXL = await size('.verse-ar');
  const enXL = await size('.verse-en');
  expect(arXL / ar).toBeGreaterThan(enXL / en);
  expect(enXL).toBeGreaterThan(en);
  // UI chrome keeps its size.
  expect(await chrome()).toBe(ui);

  await page.reload();
  // Applied before the app runs: no jump.
  expect(await page.evaluate(() => document.documentElement.dataset.textSize)).toBe('XL');
  await expect(verse.locator('.verse-ar')).toBeVisible({ timeout: 15_000 });
  expect(await size('.verse-ar')).toBeCloseTo(arXL, 1);
});
