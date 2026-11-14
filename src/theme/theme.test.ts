import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  THEME_COLORS,
  THEME_KEY,
  applyTheme,
  loadThemePref,
  resolveTheme,
  startTheme,
  useTheme,
} from './theme';

/** A fake prefers-color-scheme query whose answer the test can flip. */
function fakeSystem(dark: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
  };
  window.matchMedia = vi.fn(() => query) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      query.matches = next;
      listeners.forEach((fn) => fn({ matches: next }));
    },
    listeners,
  };
}

const html = () => document.documentElement;
const meta = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    html().removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="theme-color" content="#000000" />';
    useTheme.setState({ pref: 'system' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('reads the saved choice; anything else, or blocked storage, is "system"', () => {
    expect(loadThemePref()).toBe('system');
    localStorage.setItem(THEME_KEY, 'light');
    expect(loadThemePref()).toBe('light');
    localStorage.setItem(THEME_KEY, 'purple');
    expect(loadThemePref()).toBe('system');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadThemePref()).toBe('system');
  });

  it('resolves "system" from the system setting', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('applies a theme to <html data-theme> and the theme-color meta', () => {
    applyTheme('light');
    expect(html().dataset.theme).toBe('light');
    expect(meta()?.content).toBe(THEME_COLORS.light);
    applyTheme('dark');
    expect(html().dataset.theme).toBe('dark');
    expect(meta()?.content).toBe(THEME_COLORS.dark);
  });

  it('saves the choice and applies it at once', () => {
    fakeSystem(true);
    const stop = startTheme();
    useTheme.getState().setPref('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(html().dataset.theme).toBe('light');
    stop();
  });

  it('keeps working when storage is blocked', () => {
    fakeSystem(true);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const stop = startTheme();
    expect(() => useTheme.getState().setPref('light')).not.toThrow();
    expect(html().dataset.theme).toBe('light');
    stop();
  });

  it('"system" follows live changes of the system setting; a fixed choice ignores them', () => {
    const system = fakeSystem(true);
    const stop = startTheme();
    expect(html().dataset.theme).toBe('dark');
    system.set(false);
    expect(html().dataset.theme).toBe('light');
    useTheme.getState().setPref('dark');
    system.set(true);
    system.set(false);
    expect(html().dataset.theme).toBe('dark');
    stop();
    expect(system.listeners.size).toBe(0);
  });

  it('the early script in public/ uses the same key and colors', () => {
    const script = readFileSync('public/theme-init.js', 'utf8');
    expect(script).toContain(THEME_KEY);
    expect(script).toContain(THEME_COLORS.light);
    expect(script).toContain(THEME_COLORS.dark);
    fakeSystem(true);
    localStorage.setItem(THEME_KEY, 'light');
    new Function(script)();
    expect(html().dataset.theme).toBe('light');
    expect(meta()?.content).toBe(THEME_COLORS.light);
    localStorage.removeItem(THEME_KEY);
    new Function(script)();
    expect(html().dataset.theme).toBe('dark');
  });
});
