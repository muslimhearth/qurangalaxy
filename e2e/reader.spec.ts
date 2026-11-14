import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

/** Screenshot path per project; SHOT_DIR moves them out of test-results. */
const shot = (info: TestInfo, name: string) => `${process.env.SHOT_DIR ?? 'test-results'}/${info.project.name}-${name}.png`;
const reader = (page: Page) => page.getByRole('complementary', { name: 'Surah reader' });
const rootPanel = (page: Page) => page.getByRole('complementary', { name: 'Root details' });
// Software rendering makes every frame slow; these tests take many steps.
test.slow();

const hash = (page: Page) => page.evaluate(() => decodeURIComponent(location.hash));

/** Clicks on desktop, taps on phones. */
async function press(target: Locator, isMobile: boolean) {
  if (isMobile) await target.tap();
  else await target.click();
}

test('a verse key opens the surah reader; prev/next, back and browser back', async ({ page, isMobile }, info) => {
  await page.goto('/#/root/' + encodeURIComponent('نور'));
  await expect(page.locator('.verse').first()).toBeVisible({ timeout: 15_000 });
  await press(page.getByRole('button', { name: 'Read 2:17 in its surah' }), isMobile);

  const r = reader(page);
  await expect(r).toBeVisible();
  await expect(r.getByRole('heading', { level: 2 })).toContainText('البقرة');
  await expect(r).toContainText('Al-Baqara');
  const current = r.locator('[aria-current="true"]');
  await expect(current).toHaveAttribute('data-verse', '2:17');
  await expect(current).toBeInViewport();
  // The selected root's words stay gold: نَارًا and بِنُورِهِمْ.
  await expect(current.locator('mark')).toHaveCount(2);
  await expect(rootPanel(page)).toHaveCount(0);
  expect(await hash(page)).toBe('#/surah/2/17');
  await expect(page.getByRole('tab', { name: 'Al-Baqara 2:17' })).toBeVisible();
  await page.screenshot({ path: shot(info, 'reader') });

  await press(r.getByRole('button', { name: /^Next surah/ }), isMobile);
  await expect(r.getByRole('heading', { level: 2 })).toContainText('آل عمران');
  expect(await hash(page)).toBe('#/surah/3/1');
  await press(r.getByRole('button', { name: /^Previous surah/ }), isMobile);
  await expect(r.getByRole('heading', { level: 2 })).toContainText('البقرة');
  await expect(r.locator('[data-verse="2:286"]')).toBeAttached({ timeout: 30_000 });

  // Back returns to the root panel as it was.
  await press(r.getByRole('button', { name: 'Close the reader' }), isMobile);
  await expect(reader(page)).toHaveCount(0);
  await expect(rootPanel(page).locator('.root-ar')).toHaveText('نور');
  expect(await hash(page)).toBe('#/root/نور');

  // Browser back reopens the last reader place; forward closes it again.
  await page.goBack();
  await expect(reader(page)).toBeVisible();
  expect(await hash(page)).toBe('#/surah/2/1');
  await page.goForward();
  await expect(reader(page)).toHaveCount(0);
  await expect(rootPanel(page)).toBeVisible();
});

test('a deep link opens the reader; the meanings toggle hides English and is remembered', async ({ page, isMobile }) => {
  await page.goto('/#/surah/2/255');
  const r = reader(page);
  await expect(r.locator('[aria-current="true"]')).toHaveAttribute('data-verse', '2:255', { timeout: 15_000 });
  await expect(r.locator('[aria-current="true"]')).toBeInViewport();
  await expect(r.locator('[data-verse="2:255"] .verse-en')).toBeVisible();

  const toggle = r.getByRole('button', { name: 'Show meanings' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await press(toggle, isMobile);
  await expect(r.locator('.verse-en')).toHaveCount(0);
  await page.reload();
  await expect(reader(page).locator('[data-verse="2:255"]')).toBeVisible({ timeout: 15_000 });
  await expect(reader(page).locator('.verse-en')).toHaveCount(0);
  await press(reader(page).getByRole('button', { name: 'Show meanings' }), isMobile);
  await expect(reader(page).locator('[data-verse="2:255"] .verse-en')).toBeVisible();
});

test('a lemma chip filters the verse list; Show all clears it', async ({ page, isMobile }, info) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  const panel = rootPanel(page);
  await expect(panel.locator('.verse').first()).toBeVisible({ timeout: 15_000 });
  const chip = panel.getByRole('list', { name: 'Lemmas' }).getByRole('button', { name: /رَحْمٰن/ });
  await press(chip, isMobile);
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByRole('status')).toHaveText('56 verses with رَحْمٰن');
  // Only that lemma's words are gold: in 1:1, the third word and not the fourth (رَحِيم).
  await expect(panel.locator('[data-verse="1:1"] mark')).toHaveCount(1);
  await expect(panel.locator('[data-verse="1:1"] .verse-ar > span').nth(2).locator('mark')).toHaveCount(1);
  await expect(panel.locator('[data-verse="2:37"]')).toHaveCount(0);
  await page.screenshot({ path: shot(info, 'lemma-filter') });

  await press(panel.getByRole('button', { name: 'Show all verses' }), isMobile);
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await expect(panel.locator('[data-verse="2:37"]')).toBeAttached();
});

test('Escape closes the reader first, then the root panel; the tab follows', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Keyboard only');
  await page.goto('/#/root/' + encodeURIComponent('نور'));
  await expect(page.locator('.verse').first()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Read 2:17 in its surah' }).click();
  await expect(reader(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(reader(page)).toHaveCount(0);
  await expect(rootPanel(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(rootPanel(page)).toHaveCount(0);
  // One empty tab: the tab bar hides.
  await expect(page.getByRole('tablist')).toHaveCount(0);
});
