import { expect, test, type Locator, type Page } from '@playwright/test';
import { closeSheet, closeTab, newTab, openSheet, switchTab, tabCounter, tabNames, tabSheet } from './tabHelpers';

const panelRoot = (page: Page) => page.getByLabel('Root details', { exact: true }).locator('.root-ar');
const rail = (page: Page) => page.getByRole('navigation', { name: 'Tabs' });
const shotDir = 'test-results';

/** Picks a root through the search field (Enter takes the best match). */
async function search(page: Page, text: string) {
  const box = page.getByRole('combobox');
  await box.fill(text);
  await box.press('Enter');
}

/** Clicks on desktop, taps on phones. */
async function press(target: Locator, isMobile: boolean) {
  if (isMobile) await target.tap();
  else await target.click();
}

/** Touch long-press: Playwright has no long-press gesture, so send the pointer events. */
async function longPress(page: Page, target: Locator) {
  const box = (await target.boundingBox())!;
  const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerType: 'touch', isPrimary: true, bubbles: true };
  await target.dispatchEvent('pointerdown', at);
  // Hold well past LONG_PRESS_MS: software rendering can delay the timer by over a second
  // (the first paint of the verse list is one long task).
  await page.waitForTimeout(2500);
  await target.dispatchEvent('pointerup', at);
}

/** True when `inner` lies fully inside `outer` (1 px rounding allowed). */
async function fullyInside(inner: Locator, outer: Locator) {
  const a = (await inner.boundingBox())!;
  const b = (await outer.boundingBox())!;
  return a.x >= b.x - 1 && a.x + a.width <= b.x + b.width + 1;
}

test('two roots in two tabs: switch, reload, close', async ({ page, isMobile }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox')).toBeVisible({ timeout: 15_000 });
  // One empty tab: no tab rail, no counter.
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(tabCounter(page)).toHaveCount(0);

  await search(page, 'رحم');
  await expect(panelRoot(page)).toHaveText('رحم');
  expect(await tabNames(page, isMobile)).toEqual(['رحم']);
  // Phones: a counter in the search bar, no tab row.
  if (isMobile) {
    await expect(tabCounter(page)).toHaveAccessibleName('Tabs (1)');
    await expect(page.getByRole('tablist')).toHaveCount(0);
  }

  // New tab: an empty tab, and the cursor in the search field.
  await newTab(page, isMobile);
  await expect(page.getByRole('combobox')).toBeFocused();
  await expect(page.getByLabel('Root details', { exact: true })).toHaveCount(0);
  await search(page, 'علم');
  await expect(panelRoot(page)).toHaveText('علم');
  expect(await tabNames(page, isMobile)).toEqual(['رحم', 'علم']);

  // Switching restores the root; the URL hash follows the active tab.
  await switchTab(page, 'رحم', isMobile);
  await expect(panelRoot(page)).toHaveText('رحم');
  if (!isMobile) await expect(page.getByRole('tab', { name: 'رحم' })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash))).toBe('#/root/رحم');

  // Tabs and the active tab survive a reload.
  await page.reload();
  await expect(panelRoot(page)).toHaveText('رحم', { timeout: 15_000 });
  expect(await tabNames(page, isMobile)).toEqual(['رحم', 'علم']);

  // Closing the active tab hands over to its neighbor.
  await closeTab(page, 'رحم', isMobile);
  await expect(panelRoot(page)).toHaveText('علم');
  expect(await tabNames(page, isMobile)).toEqual(['علم']);
});

test('a connected root opens in a new tab (Ctrl-click / long-press)', async ({ page, isMobile }, info) => {
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  await expect(panelRoot(page)).toHaveText('رحم', { timeout: 15_000 });
  // Wait for the verses: the panel re-renders when they arrive, which would cancel an early long-press.
  await expect(page.locator('.verse').first()).toBeAttached({ timeout: 15_000 });
  const chips = page.getByRole('list', { name: 'Connected roots' }).locator('.chip-name');
  const first = chips.nth(0);
  const second = chips.nth(1);
  const firstAr = (await first.locator('[lang="ar"]').textContent())!;
  const secondAr = (await second.locator('[lang="ar"]').textContent())!;

  if (isMobile) {
    // Record whether the counter pulses: the animation ends before the long-press is lifted.
    await page.evaluate(() => {
      const w = window as unknown as { pulsed: boolean };
      w.pulsed = false;
      new MutationObserver(() => {
        if (document.querySelector('.tab-counter .pulse')) w.pulsed = true;
      }).observe(document.body, { subtree: true, childList: true, attributes: true });
    });
    // Touch: the new tab opens in front, and the counter shows the new count.
    await longPress(page, first);
    await expect(panelRoot(page)).toHaveText(firstAr);
    await expect(tabCounter(page)).toHaveAccessibleName('Tabs (2)');
    expect(await page.evaluate(() => (window as unknown as { pulsed: boolean }).pulsed)).toBe(true);
    await switchTab(page, 'رحم', isMobile);
    await expect(panelRoot(page)).toHaveText('رحم');
    await longPress(page, chips.nth(1));
    await expect(panelRoot(page)).toHaveText(secondAr);
    await switchTab(page, 'رحم', isMobile);
  } else {
    // Mouse: background tabs, in opening order; the current tab stays.
    await first.click({ modifiers: ['ControlOrMeta'] });
    await second.click({ button: 'middle' });
    await expect(panelRoot(page)).toHaveText('رحم');
  }
  await expect.poll(() => tabNames(page, isMobile), { timeout: 30_000 }).toEqual(isMobile ? ['رحم', secondAr, firstAr] : ['رحم', firstAr, secondAr]);
  await expect(panelRoot(page)).toHaveText('رحم');
  await page.waitForTimeout(2500); // let the camera settle for the screenshot
  await page.screenshot({ path: `${shotDir}/${info.project.name}-tabs.png` });
});

test('tabs sit in the top row: a rail right of the search bar, or a counter inside it', async ({ page, isMobile }, info) => {
  await page.goto('/');
  const box = page.getByRole('combobox');
  await expect(box).toBeVisible({ timeout: 15_000 });
  await search(page, 'رحم');
  await newTab(page, isMobile);
  await search(page, 'نور');
  await expect(panelRoot(page)).toHaveText('نور');

  const bar = (await page.locator('.search').boundingBox())!;
  const panel = (await page.getByLabel('Root details', { exact: true }).boundingBox())!;
  if (isMobile) {
    await expect(page.getByRole('tablist')).toHaveCount(0);
    const counter = (await tabCounter(page).boundingBox())!;
    // Inside the bar, before the bookmarks star.
    expect(counter.y).toBeGreaterThanOrEqual(bar.y);
    expect(counter.y + counter.height).toBeLessThanOrEqual(bar.y + bar.height);
    const star = (await page.getByRole('button', { name: /^Bookmarks/ }).boundingBox())!;
    expect(counter.x + counter.width).toBeLessThanOrEqual(star.x);
  } else {
    await expect(page.getByRole('tab')).toHaveCount(2);
    const tabs = (await rail(page).boundingBox())!;
    // Same row, to the right of the bar; the panel starts below the row.
    expect(tabs.x).toBeGreaterThanOrEqual(bar.x + bar.width);
    expect(Math.abs(tabs.y + tabs.height / 2 - (bar.y + bar.height / 2))).toBeLessThan(4);
    expect(panel.y).toBeGreaterThanOrEqual(bar.y + bar.height);
    expect(panel.y).toBeGreaterThanOrEqual(tabs.y + tabs.height);
    // Two pills fit: no "⋯ N" button.
    await expect(page.getByRole('button', { name: /^All tabs/ })).toHaveCount(0);
  }
  await page.screenshot({ path: `${shotDir}/${info.project.name}-tab-pills.png` });
});

test('phone: the switcher sheet lists, switches, closes and opens tabs', async ({ page, isMobile }, info) => {
  test.skip(!isMobile, 'phones only');
  test.slow(); // real taps: each one waits for frames under software WebGL
  await page.goto('/');
  await expect(page.getByRole('combobox')).toBeVisible({ timeout: 15_000 });
  await search(page, 'رحم');
  await newTab(page, isMobile);
  await search(page, 'علم');
  await expect(panelRoot(page)).toHaveText('علم');

  // Real taps here; the helpers use click events to save time.
  await tabCounter(page).tap();
  const sheet = tabSheet(page);
  await expect(sheet.getByRole('heading')).toHaveText('2 tabs');
  // The active row is marked and has the focus.
  const active = sheet.getByRole('button', { name: 'علم', exact: true });
  await expect(active).toHaveAttribute('aria-current', 'true');
  await expect(active).toBeFocused();
  await expect(sheet.locator('.tab-row-caption').first()).toHaveText('Root · r-ḥ-m · mercy');
  await page.screenshot({ path: `${shotDir}/${info.project.name}-tab-sheet.png` });

  // Escape and the scrim close it.
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await openSheet(page);
  await page.locator('.tab-scrim').tap({ position: { x: 20, y: 20 } });
  await expect(sheet).toHaveCount(0);

  // Picking a row switches and closes.
  await openSheet(page);
  await sheet.getByRole('button', { name: 'رحم', exact: true }).tap();
  await expect(sheet).toHaveCount(0);
  await expect(panelRoot(page)).toHaveText('رحم');

  // × on a row closes that tab; the sheet stays.
  await openSheet(page);
  await sheet.getByRole('button', { name: 'Close tab علم' }).tap();
  await expect(sheet.getByRole('listitem')).toHaveCount(1);
  await closeSheet(page);
  await expect(tabCounter(page)).toHaveAccessibleName('Tabs (1)');

  // + New tab: an empty tab and the cursor in the search field.
  await newTab(page, isMobile);
  await expect(page.getByRole('combobox')).toBeFocused();
  await expect(page.getByLabel('Root details', { exact: true })).toHaveCount(0);
});

test('phone: the search field gets the room while in use', async ({ page, isMobile }, info) => {
  test.skip(!isMobile, 'phones only');
  await page.goto('/#/root/' + encodeURIComponent('رحم'));
  await expect(panelRoot(page)).toHaveText('رحم', { timeout: 15_000 });
  const box = page.getByRole('combobox');
  const star = page.getByRole('button', { name: /^Bookmarks/ });
  await expect(tabCounter(page)).toBeVisible();
  const before = (await box.boundingBox())!.width;

  await box.tap();
  await box.fill('light of the heavens');
  await expect(tabCounter(page)).toBeHidden();
  await expect(star).toBeHidden();
  // The gear stays.
  await expect(page.getByRole('button', { name: /^Search settings/ })).toBeVisible();
  expect((await box.boundingBox())!.width).toBeGreaterThan(before + 60);
  await page.screenshot({ path: `${shotDir}/${info.project.name}-search-in-use.png` });

  // Escape blurs and closes the list: the counter and the star come back.
  await box.press('Escape');
  await expect(tabCounter(page)).toBeVisible();
  await expect(star).toBeVisible();
  expect((await box.boundingBox())!.width).toBeLessThan(before + 1);
});

/** Seven saved tabs (root ids from galaxy.json, a reader tab and a search tab). */
const SEVEN = [
  { id: 'a', selectedId: 20 },
  { id: 'b', selectedId: 5 },
  { id: 'c', selectedId: 286 },
  { id: 'd', selectedId: 49 },
  { id: 'e', reader: { surah: 2, verse: 17 } },
  { id: 'f', query: 'mercy' },
  { id: 'g', selectedId: 43 },
].map((t) => ({ selectedId: null, query: '', searchMode: 'roots', openVerse: null, reader: null, ...t }));

test('desktop: with many tabs the strip keeps the active pill in view; "⋯ N" lists them all', async ({ page, isMobile }, info) => {
  test.skip(isMobile, 'desktop only');
  await page.addInitScript((tabs) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('qrg.tabs.v1', JSON.stringify({ tabs, activeId: 'a' }));
  }, SEVEN);
  // A plain visit adds an empty tab at the end and opens it: 8 tabs, the last one active.
  await page.goto('/');
  await expect(page.getByRole('tab')).toHaveCount(8, { timeout: 15_000 });
  const strip = page.getByRole('tablist');
  const activePill = () => page.locator('.tab-pill.on');
  await expect(page.getByRole('tab', { name: 'New tab' })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => fullyInside(activePill(), strip), { timeout: 15_000 }).toBe(true);

  // Some pills are hidden: "⋯ 8" shows and opens the switcher popover.
  const more = page.getByRole('button', { name: 'All tabs (8)' });
  await expect(more).toBeVisible();
  await expect(more).toHaveText('⋯8');
  await page.screenshot({ path: `${shotDir}/${info.project.name}-tab-strip-8.png` });
  await more.click();
  const pop = page.getByRole('dialog', { name: 'All tabs' });
  await expect(pop.getByRole('listitem')).toHaveCount(8);
  await page.screenshot({ path: `${shotDir}/${info.project.name}-tab-popover.png` });

  // Picking the first tab switches, closes the popover and scrolls its pill into view.
  await pop.getByRole('button', { name: 'رحم', exact: true }).click();
  await expect(pop).toHaveCount(0);
  await expect(panelRoot(page)).toHaveText('رحم', { timeout: 15_000 });
  await expect(page.getByRole('tab', { name: 'رحم' })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => fullyInside(activePill(), strip), { timeout: 15_000 }).toBe(true);

  // Arrow keys move along the strip; the focused pill scrolls into view too.
  await page.getByRole('tab', { name: 'رحم' }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'New tab' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'New tab' })).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => fullyInside(activePill(), strip), { timeout: 15_000 }).toBe(true);
});

test('desktop: the search bar widens while in use and the rail steps aside', async ({ page, isMobile }, info) => {
  test.skip(isMobile, 'desktop only');
  await page.goto('/');
  const box = page.getByRole('combobox');
  await expect(box).toBeVisible({ timeout: 15_000 });
  await search(page, 'رحم');
  await newTab(page, isMobile);
  await search(page, 'نور');
  await expect(panelRoot(page)).toHaveText('نور');
  await expect(rail(page)).toBeVisible();
  const bar = page.locator('.search');
  /** True when the bar ends left of the rail (its width transition is over). */
  const besideRail = async () => {
    const b = (await bar.boundingBox())!;
    return b.x + b.width <= (await rail(page).boundingBox())!.x;
  };
  await expect.poll(besideRail).toBe(true);
  const narrow = (await bar.boundingBox())!.width;

  await box.click();
  await box.fill('light');
  await expect(page.getByRole('option').first()).toBeVisible();
  await expect(rail(page)).toBeHidden();
  await expect.poll(async () => (await bar.boundingBox())!.width).toBeGreaterThan(narrow + 100);
  // The result list has the bar's width.
  const list = (await page.locator('.search-results').boundingBox())!;
  expect(list.width).toBeGreaterThan(narrow + 90);
  await page.screenshot({ path: `${shotDir}/${info.project.name}-search-in-use.png` });

  // Escape blurs and closes the list: the bar shrinks back and the rail shows again.
  await box.press('Escape');
  await expect(rail(page)).toBeVisible();
  await expect.poll(besideRail).toBe(true);
  expect(Math.round((await bar.boundingBox())!.width)).toBe(Math.round(narrow));
  await expect.poll(() => fullyInside(page.locator('.tab-pill.on'), page.getByRole('tablist')), { timeout: 15_000 }).toBe(true);
});

type Cam = { position: number[]; target: number[] };
/** Camera position and look-at target (dev-only hook in CameraRig). */
const camera = (page: Page) => page.evaluate(() => (window as unknown as { __qrgCamera: () => Cam }).__qrgCamera());
/** Largest coordinate difference between two camera reads, relative to the camera distance. */
function drift(a: Cam, b: Cam): number {
  const dist = Math.hypot(...a.position.map((v, i) => v - a.target[i]!));
  const d = [...a.position, ...a.target].map((v, i) => Math.abs(v - [...b.position, ...b.target][i]!));
  return Math.max(...d) / dist;
}
/** Waits until the camera stops moving and the focus ring is in place; returns the pose. */
async function settled(page: Page): Promise<Cam> {
  // The 3D scene loads after the UI.
  await page.waitForFunction(() => '__qrgCamera' in window, null, { timeout: 30_000 });
  let last = await camera(page);
  // Three still reads in a row: software rendering can skip frames, so one still read proves little.
  let stillReads = 0;
  await expect
    .poll(
      async () => {
        const now = await camera(page);
        const still = drift(now, last) < 1e-5 && (await page.locator('body').getAttribute('data-focus')) === 'still';
        stillReads = still ? stillReads + 1 : 0;
        last = now;
        return stillReads >= 3;
      },
      { timeout: 20_000, intervals: [400] },
    )
    .toBe(true);
  return last;
}

test('a tab keeps its galaxy view: switching back restores the camera at once, with no fly-to', async ({ page, isMobile }) => {
  test.slow(); // software rendering: each wait for a still camera takes seconds
  await page.goto('/');
  await expect(page.getByRole('combobox')).toBeVisible({ timeout: 15_000 });
  await search(page, 'رحم');
  await expect(panelRoot(page)).toHaveText('رحم');
  const framed = await settled(page);

  // Zoom out with the wheel over the galaxy: the view moves away from the root.
  const canvas = page.locator('canvas');
  const box = (await canvas.boundingBox())!;
  await canvas.evaluate(
    (el, at) => {
      for (let i = 0; i < 4; i++)
        el.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, deltaMode: 0, clientX: at.x, clientY: at.y, bubbles: true, cancelable: true }));
    },
    { x: box.x + box.width * 0.3, y: box.y + box.height * 0.3 },
  );
  const moved = await settled(page);
  expect(drift(moved, framed)).toBeGreaterThan(0.01);
  await expect(page.getByRole('button', { name: 'Back to رحم' })).toBeVisible();

  // A second tab with another root flies there as before.
  await newTab(page, isMobile);
  await search(page, 'علم');
  await expect(panelRoot(page)).toHaveText('علم');
  const other = await settled(page);
  expect(drift(other, moved)).toBeGreaterThan(0.01);

  // Back to the first tab: the camera is where the user left it from the first frame on.
  await switchTab(page, 'رحم', isMobile);
  await expect(panelRoot(page)).toHaveText('رحم');
  const drifts: number[] = [];
  for (let i = 0; i < 5; i++) {
    drifts.push(drift(await camera(page), moved));
    await page.waitForTimeout(150);
  }
  expect(Math.max(...drifts)).toBeLessThan(1e-3);
  expect(await page.locator('body').getAttribute('data-focus')).toBe('still');
  // "Back to" comes back too, and still flies to the root.
  const back = page.getByRole('button', { name: 'Back to رحم' });
  await expect(back).toBeVisible();
  await press(back, isMobile);
  await expect(back).toHaveCount(0);
  await expect.poll(async () => drift(await camera(page), moved), { timeout: 10_000 }).toBeGreaterThan(0.01);
});
