import { expect, test, type Locator, type Page } from '@playwright/test';
import { tabCounter } from './tabHelpers';

// G26: the word card on real data. Software rendering makes every frame slow.
test.slow();

const reader = (page: Page) => page.getByRole('complementary', { name: 'Surah reader' });
const card = (page: Page) => page.getByRole('dialog', { name: /^Word \d+ of / });
/** Word 10 of 2:30: قَالُوٓا۟. */
const qalu = (page: Page) => reader(page).locator('[data-verse="2:30"] .verse-ar .qw[data-w="10"]');

/** Clicks on desktop, taps on phones. */
async function press(target: Locator, isMobile: boolean) {
  if (isMobile) await target.tap();
  else await target.click();
}

async function openQalu(page: Page, isMobile: boolean) {
  await page.goto('/?nointro#/surah/2/30');
  await expect(qalu(page)).toBeVisible({ timeout: 30_000 });
  await expect(qalu(page)).toHaveText('قَالُوٓا۟');
  await press(qalu(page), isMobile);
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByRole('button', { name: /Same form/ })).toBeVisible({ timeout: 30_000 });
}

test('reader word → card with grammar and counts; same lemma expands; a verse opens', async ({ page, isMobile }) => {
  await openQalu(page, isMobile);
  const c = card(page);
  await expect(c).toContainText('2:30 · word 10');
  await expect(qalu(page)).toHaveClass(/\bon\b/);
  await expect(c.getByRole('button', { name: 'Close word details' })).toBeFocused();
  await expect(c.getByRole('list', { name: 'Parts of the word' })).toContainText('suffix · they');
  await expect(c.locator('.wc-gram')).toContainText('Verb·Form I·perfect (past)·active');
  await expect(c.locator('.wc-gram')).toContainText('3rd person·masculine·plural');
  await expect(c.getByRole('button', { name: /Same form/ })).toContainText(/74 verses.*77/);
  await expect(c.getByRole('button', { name: /Same lemma/ })).toContainText(/1,321 verses.*1,618/);
  await expect(c.getByRole('button', { name: /Same root/ })).toContainText(/1,383 verses.*1,722/);
  await expect(c).toHaveClass(isMobile ? /\bsheet\b/ : /\bpop\b/);
  if (isMobile) await expect(qalu(page)).toBeInViewport();

  const lemma = c.getByRole('button', { name: /Same lemma/ });
  await press(lemma, isMobile);
  await expect(lemma).toHaveAttribute('aria-expanded', 'true');
  await expect(c.getByRole('button', { name: 'Open 2:30' })).toContainText('here');
  const v214 = c.getByRole('button', { name: 'Open 2:14' });
  await expect(v214.locator('mark')).toHaveText('قَالُوٓا۟');
  await press(v214, isMobile);
  await expect(card(page)).toHaveCount(0);
  await expect(reader(page).locator('[aria-current="true"]')).toHaveAttribute('data-verse', '2:14');
});

test('keyboard: Enter opens, Escape closes and returns focus, the reader stays', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard test on desktop only');
  await openQalu(page, false);
  await page.keyboard.press('Escape');
  await expect(card(page)).toHaveCount(0);
  await expect(reader(page)).toBeVisible();
  await expect(qalu(page)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(reader(page).locator('[data-verse="2:30"] .qw[data-w="11"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(card(page)).toContainText('2:30 · word 11');
});

test('root link: desktop selects the root here; phone opens it in a new tab', async ({ page, isMobile }) => {
  await openQalu(page, isMobile);
  await press(card(page).getByRole('button', { name: /Open the root قول/ }), isMobile);
  await expect(card(page)).toHaveCount(0);
  if (isMobile) {
    // The reader tab stays; the new tab (now in front) shows the root.
    await expect(tabCounter(page)).toHaveAccessibleName('Tabs (2)');
  } else {
    await expect(reader(page)).toHaveCount(0);
  }
  await expect(page.getByRole('complementary', { name: 'Root details' }).locator('.root-ar')).toHaveText('قول');
});
