import { expect, test, type Page } from '@playwright/test';

/** Boxes of the labels currently shown. */
const shown = (page: Page) =>
  page.locator('.label-layer > div').evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).style.opacity === '1')
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, bottom: r.bottom, text: el.textContent ?? '' };
      }),
  );

/** Mean distance of the shown labels from their center: grows when the camera zooms in. */
const spread = async (page: Page) => {
  const pts = await shown(page);
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.bottom, 0) / pts.length;
  return pts.reduce((s, p) => s + Math.hypot(p.x - cx, p.bottom - cy), 0) / pts.length;
};

test('a tap near a star selects it at full view, and closing flies back out', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch');
  test.setTimeout(120_000);
  await page.goto('/');
  await expect.poll(async () => (await shown(page)).length, { timeout: 30_000 }).toBeGreaterThan(5);
  const before = await spread(page);

  // Tap a little below a label: near its star, but not exactly on it.
  const label = (await shown(page))[0]!;
  await page.touchscreen.tap(label.x + 6, label.bottom + 8);
  const panel = page.getByLabel('Root details', { exact: true });
  await expect(panel).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Close root details' }).tap();
  await expect(panel).toHaveCount(0);
  // Back at the whole galaxy: the labels gather again like at the start.
  await expect.poll(() => spread(page), { timeout: 30_000 }).toBeLessThan(before * 1.4);
});
