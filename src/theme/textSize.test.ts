import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { TEXT_SIZES, TEXT_SIZE_KEY, applyTextSize, loadTextSize, useTextSize } from './textSize';

const html = () => document.documentElement;

describe('text size', () => {
  beforeEach(() => {
    localStorage.clear();
    html().removeAttribute('data-text-size');
    useTextSize.setState({ size: 'M' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('has four sizes, S to XL', () => {
    expect(TEXT_SIZES).toEqual(['S', 'M', 'L', 'XL']);
  });

  it('reads the saved size; anything else, or blocked storage, is M', () => {
    expect(loadTextSize()).toBe('M');
    localStorage.setItem(TEXT_SIZE_KEY, 'XL');
    expect(loadTextSize()).toBe('XL');
    localStorage.setItem(TEXT_SIZE_KEY, 'huge');
    expect(loadTextSize()).toBe('M');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(loadTextSize()).toBe('M');
  });

  it('applies a size to <html data-text-size>', () => {
    applyTextSize('L');
    expect(html().dataset.textSize).toBe('L');
  });

  it('saves a new size and applies it at once, also with blocked storage', () => {
    useTextSize.getState().setSize('S');
    expect(localStorage.getItem(TEXT_SIZE_KEY)).toBe('S');
    expect(html().dataset.textSize).toBe('S');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => useTextSize.getState().setSize('XL')).not.toThrow();
    expect(html().dataset.textSize).toBe('XL');
  });

  it('the early script in public/ applies the saved size before the first paint', () => {
    const script = readFileSync('public/theme-init.js', 'utf8');
    expect(script).toContain(TEXT_SIZE_KEY);
    window.matchMedia = vi.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia;
    localStorage.setItem(TEXT_SIZE_KEY, 'XL');
    new Function(script)();
    expect(html().dataset.textSize).toBe('XL');
    localStorage.setItem(TEXT_SIZE_KEY, 'bogus');
    new Function(script)();
    expect(html().dataset.textSize).toBe('M');
  });

  it('every size has CSS scales for Arabic and English, Arabic in larger steps', () => {
    const css = readFileSync('src/styles.css', 'utf8');
    const scale = (size: string, name: string) => {
      const block = new RegExp(`\\[data-text-size='${size}'\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';
      return Number(new RegExp(`--${name}-scale:\\s*([\\d.]+)`).exec(block)?.[1]);
    };
    for (const size of ['S', 'L', 'XL']) {
      expect(scale(size, 'ar')).toBeGreaterThan(0);
      expect(scale(size, 'en')).toBeGreaterThan(0);
    }
    expect(scale('XL', 'ar') - 1).toBeGreaterThan(scale('XL', 'en') - 1);
    expect(scale('L', 'ar') - 1).toBeGreaterThan(scale('L', 'en') - 1);
    expect(1 - scale('S', 'ar')).toBeGreaterThanOrEqual(1 - scale('S', 'en'));
  });
});
