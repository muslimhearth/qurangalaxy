import { existsSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { MODEL } from '../src/semantic/models';

const modelFile = `public/models/${MODEL.id}/onnx/model_quantized.onnx`;

test('meaning search finds صبر for "patience" without third-party requests', async ({ page, isMobile, baseURL }) => {
  test.skip(!existsSync(modelFile), `Model missing (${modelFile}). Run \`pnpm models\` first.`);
  // First use downloads the model (34 MB) and the runtime (14 MB) and starts it in software.
  test.setTimeout(150_000);

  // Our own host: localhost in dev, the real domain when testing a deployed site.
  const own = new URL(baseURL!).hostname;
  const foreign: string[] = [];
  page.on('request', (r) => {
    const host = new URL(r.url()).hostname;
    if (![own, 'localhost', '127.0.0.1'].includes(host) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) {
      foreign.push(r.url());
    }
  });

  await page.goto('/');
  // The search mode lives behind the gear at the end of the search bar.
  const gear = page.getByRole('button', { name: /search settings/i });
  await expect(gear).toHaveAccessibleName(/Exact/);
  if (isMobile) await gear.tap();
  else await gear.click();
  const meaning = page.getByRole('radio', { name: 'Semantic' });
  if (isMobile) await meaning.tap();
  else await meaning.click();
  await expect(meaning).toHaveAttribute('aria-checked', 'true');
  await expect(gear).toHaveAccessibleName(/Semantic/);
  await page.screenshot({ path: `test-results/${test.info().project.name}-search-mode.png` });

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
