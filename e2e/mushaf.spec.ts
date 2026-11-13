import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { PNG } from 'pngjs';

// The Mushaf view is not wired into App yet; these tests use its dev harness page.
const HARNESS = '/src/mushaf/dev/index.html';
const RHM = '#/root/' + encodeURIComponent('رحم');

const shot = (info: TestInfo, name: string) => `test-results/${info.project.name}-mushaf-${name}.png`;

/** The canvas box and its mosaic geometry (data attributes, canvas pixels). */
async function geometry(page: Page) {
  const canvas = page.locator('.mushaf-canvas');
  const box = (await canvas.boundingBox())!;
  const d = await canvas.evaluate((c) => ({ ...(c as HTMLElement).dataset }));
  return { box, left: Number(d.left), top: Number(d.top), pitch: Number(d.pitch), dot: Number(d.dot) };
}

/** Page point at the center of dot `col` in row `row`. */
async function dotPoint(page: Page, col: number, row: number) {
  const g = await geometry(page);
  return {
    x: g.box.x + g.left + col * g.pitch + g.dot / 2,
    y: g.box.y + g.top + row * g.pitch + g.dot / 2,
  };
}

/** Page points (CSS px) of the amber (#ffc35a) pixels on the canvas: lit verses of the selected root. */
async function amberPoints(page: Page) {
  const { box } = await geometry(page);
  const png = PNG.sync.read(await page.screenshot({ clip: box, scale: 'css' }));
  const points: { x: number; y: number }[] = [];
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const [r, g, b] = [png.data[i]!, png.data[i + 1]!, png.data[i + 2]!];
      if (r >= 235 && g >= 170 && g <= 215 && b >= 50 && b <= 130) points.push({ x: box.x + x, y: box.y + y });
    }
  }
  return points;
}

/** Hover (mouse) or press (touch) a point. */
async function point(page: Page, isMobile: boolean, p: { x: number; y: number }) {
  if (isMobile) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.move(p.x, p.y);
}

test('the mosaic lights the verses of the selected root', async ({ page }, info) => {
  await page.goto(HARNESS);
  await expect(page.locator('.mushaf-canvas')).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 15_000 });
  expect(await amberPoints(page)).toHaveLength(0);
  await page.screenshot({ path: shot(info, 'plain') });

  await page.goto(HARNESS + RHM);
  await expect(page.getByLabel('Root details', { exact: true }).locator('.root-ar')).toHaveText('رحم');
  await expect.poll(async () => (await amberPoints(page)).length, { timeout: 15_000 }).toBeGreaterThan(200);
  await page.screenshot({ path: shot(info, 'rhm') });
});

test('a dot shows its surah name and verse key', async ({ page, isMobile }, info) => {
  await page.goto(HARNESS + RHM);
  await expect.poll(async () => (await amberPoints(page)).length, { timeout: 15_000 }).toBeGreaterThan(200);
  // Row 2 lies inside Al-Baqarah at any screen width.
  await point(page, isMobile, await dotPoint(page, 3, 2));
  const tip = page.getByRole('tooltip');
  await expect(tip).toContainText('Al-Baqarah');
  await expect(tip).toContainText(/2:\d+/);
  await page.screenshot({ path: shot(info, 'tooltip') });
});

test('tapping a lit dot scrolls the root panel to that verse', async ({ page, isMobile }, info) => {
  await page.goto(HARNESS + RHM);
  await expect.poll(async () => (await amberPoints(page)).length, { timeout: 15_000 }).toBeGreaterThan(200);
  // Let the fade-in finish so only full-color dots match, then pick a late verse (past "show more").
  await page.waitForTimeout(800);
  const points = await amberPoints(page);
  const target = points[points.length - 1]!;
  if (isMobile) await page.touchscreen.tap(target.x, target.y);
  else await page.mouse.click(target.x, target.y);

  const key = (await page.getByRole('tooltip').locator('.mushaf-tip-key').textContent())!.trim();
  const verse = page.locator('.verse.flash');
  await expect(verse).toHaveCount(1);
  await expect(verse.locator('.verse-key')).toHaveText(key);
  await expect(verse).toBeInViewport();
  await page.screenshot({ path: shot(info, 'tap') });
});
