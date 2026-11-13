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
async function wheel(page: Page, n: number, init: { deltaX?: number; deltaY?: number; ctrlKey?: boolean }) {
  await page.evaluate(
    ({ n, init }) => {
      const canvas = document.querySelector('canvas')!;
      const r = canvas.getBoundingClientRect();
      for (let i = 0; i < n; i++) {
        canvas.dispatchEvent(
          new WheelEvent('wheel', { ...init, clientX: r.width / 2, clientY: r.height / 2, bubbles: true, cancelable: true }),
        );
      }
    },
    { n, init },
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
