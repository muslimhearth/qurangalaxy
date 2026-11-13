import { expect, test, type Page } from '@playwright/test';

/** One label's screen box, whether the declutter step shows it or not. */
interface Label {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shown: boolean;
}

/** Every label in the label layer, by root text. */
async function labels(page: Page): Promise<Map<string, Label>> {
  const list = await page.locator('.label-layer > div').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      const text = el.textContent ?? '';
      return { text, x: r.x, y: r.y, w: r.width, h: r.height, shown: (el as HTMLElement).style.opacity === '1' };
    }),
  );
  return new Map(list.map((l) => [l.text, l]));
}

const center = (l: Label) => ({ x: l.x + l.w / 2, y: l.y + l.h / 2 });
const distance = (a: Label, b: Label) => Math.hypot(center(a).x - center(b).x, center(a).y - center(b).y);
const overlap = (a: Label, b: Label) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** The 20 strongest connected roots of the open panel, strongest first (the ring). */
async function ringRoots(page: Page): Promise<string[]> {
  await page.getByRole('button', { name: /^Show all [\d,]+ connected roots$/ }).click();
  const chips = page.getByRole('list', { name: 'Connected roots' }).locator('span[lang="ar"]');
  return (await chips.allTextContents()).slice(0, 20);
}

const RAHMA = 'رحم';

test('the 20 strongest links form a readable ring beside the panel', async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.goto('/#/root/' + encodeURIComponent(RAHMA));
  const panel = (await page.getByLabel('Root details', { exact: true }).boundingBox())!;
  const bar = (await page.locator('.search-row').boundingBox())!;
  const ring = await ringRoots(page);
  expect(ring).toHaveLength(20);
  const sideways = panel.x > 0; // side panel (desktop) or bottom sheet (phones)

  // Poll until the glide and the camera have settled: every ring label shown in the free area.
  await expect
    .poll(
      async () => {
        if ((await page.locator('body').getAttribute('data-focus')) !== 'still') return 'gliding';
        const all = await labels(page);
        const bad = [RAHMA, ...ring].filter((t) => {
          const l = all.get(t);
          if (!l?.shown) return true;
          const free = sideways ? l.x + l.w <= panel.x : l.y + l.h <= panel.y;
          return !free || l.y < bar.y + bar.height || l.x < 0;
        });
        return bad.length ? `not in the free area: ${bad.join(' ')}` : 'ok';
      },
      { timeout: 45_000 },
    )
    .toBe('ok');

  // No two ring labels touch (their raw boxes, not only the ones the declutter step keeps).
  const all = await labels(page);
  const boxes = [RAHMA, ...ring].map((t) => all.get(t)!);
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) expect(overlap(a, b), `${a.text} overlaps ${b.text}`).toBe(false);
  }
  // Closer means more shared verses: the strongest link sits nearer than the weakest.
  expect(distance(all.get(ring[0]!)!, all.get(RAHMA)!)).toBeLessThan(distance(all.get(ring[19]!)!, all.get(RAHMA)!));
  await page.screenshot({ path: `test-results/${info.project.name}-focus-ring.png` });
});

test('closing the panel sends the ring stars back to their places', async ({ page }) => {
  test.setTimeout(90_000);
  // قول is in the ring of رحم; يوم is not and never moves. Both are frequent roots, so their
  // labels stay in the layer after closing. The distance ratio does not depend on the zoom.
  const moving = 'قول';
  const still = 'يوم';
  await page.goto('/#/root/' + encodeURIComponent(RAHMA));
  const vp = page.viewportSize()!;
  // In the ring: قول sits near رحم.
  await expect
    .poll(
      async () => {
        const all = await labels(page);
        const a = all.get(moving);
        const c = all.get(RAHMA);
        return a && c ? distance(a, c) : Infinity;
      },
      { timeout: 45_000 },
    )
    .toBeLessThan(Math.min(vp.width, vp.height) * 0.45);

  await page.getByRole('button', { name: 'Close root details' }).click();
  await expect(page.getByLabel('Root details', { exact: true })).toHaveCount(0);
  // Back home, قول is about as far from رحم as يوم is (ratio about 0.8); in the ring it was below 0.2.
  await expect
    .poll(
      async () => {
        if ((await page.locator('body').getAttribute('data-focus')) !== 'still') return 0;
        const all = await labels(page);
        const [a, b, c] = [all.get(moving), all.get(still), all.get(RAHMA)];
        return a && b && c ? distance(a, c) / distance(b, c) : 0;
      },
      { timeout: 45_000 },
    )
    .toBeGreaterThan(0.5);
});
