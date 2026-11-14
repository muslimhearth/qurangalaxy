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

test('"Back to" sits above the sheet and never covers the search settings or the sheet buttons', async ({ page, isMobile }, info) => {
  test.skip(!isMobile, 'phone layout');
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const panel = page.getByLabel('Root details', { exact: true });
  await expect(panel).toBeVisible();
  // The 3D scene loads lazily: wait for its labels, then swipe the view away (wheel events).
  await expect
    .poll(() => page.locator('.label-layer > div').evaluateAll((els) => els.filter((e) => (e as HTMLElement).style.opacity === '1').length), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    for (let i = 0; i < 8; i++) {
      canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: 30, deltaY: 2, clientX: 100, clientY: 200, bubbles: true, cancelable: true }));
    }
  });
  const back = page.getByRole('button', { name: 'Back to رحم' });
  await expect(back).toBeVisible({ timeout: 15_000 });
  // Above the sheet's top edge.
  const b = (await back.boundingBox())!;
  const p = (await panel.boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(p.y + 1);
  await page.screenshot({ path: `test-results/${info.project.name}-back-to.png` });

  // The settings popover is on top: its "Meaning" button is the element at its own center.
  await page.getByRole('button', { name: /search settings/i }).tap();
  const meaning = page.getByRole('radio', { name: 'Meaning' });
  const box = (await meaning.boundingBox())!;
  const onTop = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.textContent ?? '',
    { x: box.x + box.width / 2, y: box.y + box.height / 2 },
  );
  expect(onTop).toBe('Meaning');
  // Close the popover: it may reach over the sheet's header.
  await page.getByRole('button', { name: /search settings/i }).tap();

  // Maximized sheet: no "Back to" over its header buttons.
  await page.getByRole('button', { name: 'Maximize root details' }).tap();
  await expect(back).toHaveCount(0);
});
