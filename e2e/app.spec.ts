import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { PNG } from 'pngjs';

/** Console messages from libraries we do not control; anything else fails the test. */
const KNOWN_NOISE = [/THREE\.Clock/, /PCFSoftShadowMap/, /WebGPU/i, /GPU stall/i];

/** Screenshot path per project, e.g. test-results/android-galaxy.png. */
const shot = (info: TestInfo, name: string) => `test-results/${info.project.name}-${name}.png`;

/**
 * Counts lit pixels in the middle of the screen, away from the search bar and title bar,
 * so only the 3D scene is measured.
 */
async function litScenePixels(page: Page): Promise<number> {
  const vp = page.viewportSize()!;
  const clip = { x: 0, y: vp.height * 0.2, width: vp.width, height: vp.height * 0.6 };
  const png = PNG.sync.read(await page.screenshot({ clip }));
  let lit = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    // Brightest channel above 80/255 counts as a star, a link or a glow.
    if (Math.max(png.data[i]!, png.data[i + 1]!, png.data[i + 2]!) > 80) lit++;
  }
  return lit;
}

/** Collects unexpected console errors for the page. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !KNOWN_NOISE.some((re) => re.test(m.text()))) errors.push(m.text());
  });
  return errors;
}

test('loads the real galaxy without errors', async ({ page }, info) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  // The loading screen goes away once galaxy.json is in the store.
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 15_000 });
  // The scene must actually draw; a canvas that stays black is a failure. The first frame can
  // take a few seconds on software GPUs (CI containers) while shaders compile, so poll.
  await expect.poll(() => litScenePixels(page), { timeout: 15_000 }).toBeGreaterThan(500);
  // Screenshot only: let the camera finish its start-up ease, so labels and stars line up
  // even on slow software renderers (about 1-2 fps in CI containers).
  await page.waitForTimeout(3000);
  await page.screenshot({ path: shot(info, 'galaxy') });
  expect(errors).toEqual([]);
});

test('search selects a root and shows highlighted verses', async ({ page }, info) => {
  await page.goto('/');
  const search = page.getByRole('combobox');
  await search.fill('rhm');
  await search.press('Enter');

  const panel = page.getByLabel('Root details', { exact: true });
  await expect(panel.locator('.root-ar')).toHaveText('رحم');
  await expect(panel.locator('.verse mark').first()).toBeVisible({ timeout: 15_000 });
  expect(decodeURIComponent(new URL(page.url()).hash)).toBe('#/root/رحم');
  await page.screenshot({ path: shot(info, 'root-panel') });

  // Escape closes the panel and clears the hash.
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

test('Escape leaves the search field first, then clears it, then closes the panel', async ({ page }) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const panel = page.getByLabel('Root details', { exact: true });
  await expect(panel).toBeVisible({ timeout: 15_000 });
  const search = page.getByRole('combobox');
  await search.click();
  await search.fill('light');
  await expect(page.getByRole('option').first()).toBeVisible();
  // 8 of N roots, and "Show all" opens the rest.
  await expect(page.getByTestId('search-count')).toHaveText(/^8 of \d+ roots$/);
  await page.getByRole('option', { name: /^Show all \d+ roots$/ }).click();
  await expect.poll(() => page.getByRole('option').count()).toBeGreaterThan(8);

  await page.keyboard.press('Escape');
  await expect(search).not.toBeFocused();
  await expect(search).toHaveValue('light');
  await expect(page.getByRole('option')).toHaveCount(0);
  await expect(panel).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(search).toHaveValue('');
  await expect(panel).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});

test('deep link highlights the right word in a joined-word verse', async ({ page }) => {
  // In 2:181 the corpus joins بَعْدَ مَا into one word; later words must still line up.
  await page.goto('/#/root/' + encodeURIComponent('سمع'));
  const verse = page.locator('.verse').filter({ has: page.locator('.verse-key', { hasText: /^2:181$/ }) });
  await expect(verse.locator('mark')).toHaveText(['سَمِعَهُۥ', 'سَمِيعٌ'], { timeout: 15_000 });
});

test('page never scrolls sideways', async ({ page }) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  await expect(page.locator('.verse mark').first()).toBeVisible({ timeout: 15_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('root panel docks to the side on desktop and to the bottom on phones', async ({ page, isMobile }) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const box = await page.getByLabel('Root details', { exact: true }).boundingBox();
  const vp = page.viewportSize()!;
  expect(box).not.toBeNull();
  if (isMobile) {
    // Bottom sheet: nearly full width, starts below the top third, ends at the bottom edge.
    expect(box!.width).toBeGreaterThan(vp.width * 0.9);
    expect(box!.y).toBeGreaterThan(vp.height * 0.3);
    expect(box!.y + box!.height).toBeGreaterThan(vp.height - 24);
  } else {
    // Side panel: on the right half, leaving the galaxy visible on the left.
    expect(box!.x).toBeGreaterThan(vp.width / 2);
  }
});

test('search works with touch on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch only');
  await page.goto('/');
  const search = page.getByRole('combobox');
  await search.tap();
  await search.fill('علم');
  await page.getByRole('option').first().tap();
  await expect(page.getByLabel('Root details', { exact: true }).locator('.root-ar')).toHaveText('علم');
  // The close button is big enough to tap (at least 32 px).
  const close = await page.getByRole('button', { name: 'Close root details' }).boundingBox();
  expect(Math.min(close!.width, close!.height)).toBeGreaterThanOrEqual(32);
  await page.getByRole('button', { name: 'Close root details' }).tap();
  await expect(page.getByLabel('Root details', { exact: true })).toHaveCount(0);
});

test('title bar hides behind the open sheet on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'bottom sheet only');
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  await expect(page.locator('.verse mark').first()).toBeVisible({ timeout: 15_000 });
  // The sheet is glassy (semi-transparent), so the title bar under it must not render at all.
  await expect(page.locator('.about')).toBeHidden();
  // Closing the sheet brings the title bar back.
  await page.getByRole('button', { name: 'Close root details' }).tap();
  await expect(page.locator('.about')).toBeVisible();
});

/** Screen boxes of the labels the declutter step currently shows. */
async function shownLabels(page: Page) {
  return page.locator('.label-layer > div').evaluateAll((els) =>
    els
      .filter((el) => (el as HTMLElement).style.opacity === '1')
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { text: el.textContent ?? '', x: r.x, y: r.y, w: r.width, h: r.height };
      }),
  );
}

test('visible labels never overlap', async ({ page }) => {
  await page.goto('/');
  await expect.poll(async () => (await shownLabels(page)).length, { timeout: 15_000 }).toBeGreaterThan(5);
  const labels = await shownLabels(page);
  for (const [i, a] of labels.entries()) {
    for (const b of labels.slice(i + 1)) {
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      expect(overlap, `${a.text} overlaps ${b.text}`).toBe(false);
    }
  }
});

test('selected root stays in view beside the panel, not under it', async ({ page }) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const panel = (await page.getByLabel('Root details', { exact: true }).boundingBox())!;
  // The camera eases in, so poll until the selected label is shown in the free area.
  await expect
    .poll(
      async () => {
        const label = (await shownLabels(page)).find((l) => l.text === 'رحم');
        if (!label) return false;
        // Side panel (desktop): left of it. Bottom sheet (phones): above it.
        return panel.x > 0 ? label.x + label.w < panel.x : label.y + label.h < panel.y;
      },
      { timeout: 20_000 },
    )
    .toBe(true);
});

test('connected roots show the strongest first, the rest on demand', async ({ page }) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const list = page.getByRole('list', { name: 'Connected roots' }).getByRole('listitem');
  await expect(list).toHaveCount(12);
  await page.getByRole('button', { name: /^Show all [\d,]+ connected roots$/ }).click();
  expect(await list.count()).toBeGreaterThan(12);
});

test('a connected root count shows the verses both roots share', async ({ page, isMobile }) => {
  await page.goto('/#/root/' + encodeURIComponent('وصي'));
  // Ranked by score: سدس (one-sixth) leads, from the inheritance verses.
  const first = page.getByRole('list', { name: 'Connected roots' }).getByRole('listitem').first();
  await expect(first).toContainText('سدس');
  const count = first.getByRole('button', { name: /^Show the \d+ verses shared with/ });
  const box = (await count.boundingBox())!;
  if (isMobile) {
    // Touch screens get a 44 px tap target.
    expect(box.height).toBeGreaterThanOrEqual(44);
    await count.tap();
  } else await count.click();
  const shared = page.getByRole('region', { name: 'Verses with وصي and سدس' });
  await expect(shared.locator('.verse')).toHaveCount(2);
  await expect(shared.locator('.verse-ar mark.alt').first()).toBeVisible();
  await expect(shared.locator('.verse-ar mark:not(.alt)').first()).toBeVisible();
});
