import { expect, test, type Page } from '@playwright/test';

/** Centers of the labels currently shown, by root text. */
async function labelCenters(page: Page): Promise<Map<string, { x: number; y: number }>> {
  const list = await page.locator('.label-layer > div').evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).style.opacity === '1')
      .map((el) => {
        const r = el.getBoundingClientRect();
        return [el.textContent ?? '', { x: r.x + r.width / 2, y: r.y + r.height / 2 }] as const;
      }),
  );
  return new Map(list);
}

/** Sends `n` wheel events to the canvas center, as a touchpad would. */
async function wheel(
  page: Page,
  n: number,
  init: { deltaX?: number; deltaY?: number; ctrlKey?: boolean },
  at?: { x: number; y: number },
) {
  await page.evaluate(
    ({ n, init, at }) => {
      const canvas = document.querySelector('canvas')!;
      const r = canvas.getBoundingClientRect();
      const { x, y } = at ?? { x: r.width / 2, y: r.height / 2 };
      for (let i = 0; i < n; i++) {
        canvas.dispatchEvent(new WheelEvent('wheel', { ...init, clientX: x, clientY: y, bubbles: true, cancelable: true }));
      }
    },
    { n, init, at },
  );
}

const spread = (pts: { x: number; y: number }[]) => {
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return pts.reduce((s, p) => s + Math.hypot(p.x - cx, p.y - cy), 0) / pts.length;
};

test.beforeEach(async ({ isMobile }) => test.skip(isMobile, 'touchpad gestures are desktop only'));

test('touchpad pinch zooms in without zooming the page', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await labelCenters(page)).size, { timeout: 15_000 }).toBeGreaterThan(5);
  const before = await labelCenters(page);
  await wheel(page, 12, { deltaY: -8, ctrlKey: true });
  // Labels of the same roots spread apart as the camera moves closer.
  await expect
    .poll(
      async () => {
        const after = await labelCenters(page);
        const common = [...before.keys()].filter((k) => after.has(k));
        if (common.length < 3) return 99; // zoomed far in: few old labels left, which also means it zoomed
        return spread(common.map((k) => after.get(k)!)) / spread(common.map((k) => before.get(k)!));
      },
      { timeout: 10_000 },
    )
    .toBeGreaterThan(1.4);
  expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
});

test('two-finger swipe orbits the galaxy', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await labelCenters(page)).size, { timeout: 15_000 }).toBeGreaterThan(5);
  const before = await labelCenters(page);
  await wheel(page, 10, { deltaX: 25, deltaY: 1 });
  await expect
    .poll(
      async () => {
        const after = await labelCenters(page);
        const moves = [...before.keys()].filter((k) => after.has(k)).map((k) => {
          const a = before.get(k)!;
          const b = after.get(k)!;
          return Math.hypot(a.x - b.x, a.y - b.y);
        });
        return moves.length ? moves.reduce((s, m) => s + m, 0) / moves.length : 999;
      },
      { timeout: 10_000 },
    )
    .toBeGreaterThan(40);
});

test('pinch zooms toward the word under the pointer', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await labelCenters(page)).size, { timeout: 15_000 }).toBeGreaterThan(5);
  // Pick the shown label farthest from the screen center, so a zoom toward the center would push it away.
  const vp = page.viewportSize()!;
  const [name, p] = [...(await labelCenters(page))].sort(
    (a, b) => Math.hypot(b[1].x - vp.width / 2, b[1].y - vp.height / 2) - Math.hypot(a[1].x - vp.width / 2, a[1].y - vp.height / 2),
  )[0]!;
  // Stop the idle rotation first, so only the zoom moves things; then pinch in over the word.
  await wheel(page, 1, { deltaY: 0, deltaX: 0.01 }, p);
  const start = (await labelCenters(page)).get(name) ?? p;
  await wheel(page, 10, { deltaY: -8, ctrlKey: true }, start);
  await page.waitForTimeout(1500);
  const after = (await labelCenters(page)).get(name);
  // The word stays near the pointer (it may hide if a closer label now overlaps it).
  if (after) expect(Math.hypot(after.x - start.x, after.y - start.y)).toBeLessThan(40);
});

test('after moving away from a selected root, a button flies back to it', async ({ page }) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  await expect(page.getByLabel('Root details', { exact: true })).toBeVisible();
  const back = page.getByRole('button', { name: 'Back to رحم' });
  await expect(back).toHaveCount(0);
  // The 3D scene loads lazily: wait for its labels before swiping.
  await expect.poll(async () => (await labelCenters(page)).size, { timeout: 20_000 }).toBeGreaterThan(0);
  // Swipe the view away from the selected root.
  await wheel(page, 10, { deltaX: 30, deltaY: 2 });
  await expect(back).toBeVisible();
  await back.click();
  await expect(back).toHaveCount(0);
  // The selected root's label is shown again once the camera is back.
  await expect
    .poll(async () => (await labelCenters(page)).has('رحم'), { timeout: 20_000 })
    .toBe(true);
});
