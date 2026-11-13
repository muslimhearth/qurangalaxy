import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { MODEL } from '../src/semantic/models';

const modelFile = `public/models/${MODEL.id}/onnx/model_quantized.onnx`;

test('meaning search finds صبر for "patience" without third-party requests', async ({ page, isMobile }) => {
  test.skip(!existsSync(modelFile), `Model missing (${modelFile}). Run \`pnpm models\` first.`);
  // First use downloads the model (22 MB) and the runtime (14 MB) and starts it in software.
  test.setTimeout(150_000);

  const foreign: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (!['localhost', '127.0.0.1'].includes(host) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) {
      foreign.push(r.url());
    }
  });

  await page.goto('/');
  const slider = page.getByRole('slider', { name: 'Exact ↔ Meaning' });
  await expect(slider).toHaveAttribute('aria-valuetext', 'Exact only');

  if (isMobile) {
    // Touch: tap the right end of the track.
    const box = (await slider.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width - 2, box.y + box.height / 2);
  } else {
    await slider.focus();
    await page.keyboard.press('End');
  }
  await expect(slider).toHaveAttribute('aria-valuetext', 'Meaning only');

  const search = page.getByRole('combobox');
  await search.fill('patience');
  const hit = page.getByRole('option').filter({ hasText: 'صبر' });
  await expect(hit).toBeVisible({ timeout: 120_000 });
  // The result names its best verses.
  await expect(hit.locator('.verse-note .refs')).toHaveText(/^\d+:\d+/);

  await hit.click();
  const panel = page.getByLabel('Root details', { exact: true });
  await expect(panel.locator('.root-ar')).toHaveText('صبر');
  expect(decodeURIComponent(new URL(page.url()).hash)).toBe('#/root/صبر');
  expect(foreign).toEqual([]);
});
