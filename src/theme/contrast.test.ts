import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** The custom properties of the first CSS block whose selector is `selector`. */
function tokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]));
}

/** sRGB channels (0..255) and alpha of a #rrggbb, rgb() or rgba() color. */
function parse(color: string): [number, number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const fn = /^rgba?\(([^)]+)\)$/.exec(color);
  if (!fn) throw new Error(`cannot parse ${color}`);
  const [r, g, b, a = 1] = fn[1]!.split(',').map(Number);
  return [r!, g!, b!, a];
}

/** `top` drawn over the opaque `bottom`. */
function over(top: string, bottom: string): string {
  const [r, g, b, a] = parse(top);
  const [R, G, B] = parse(bottom);
  const mix = (x: number, y: number) => Math.round(x * a + y * (1 - a));
  return `rgb(${mix(r, R)}, ${mix(g, G)}, ${mix(b, B)})`;
}

/** WCAG 2 relative luminance. */
function luminance(color: string): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = parse(color);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2 contrast ratio of two opaque colors. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const css = readFileSync('src/styles.css', 'utf8');
const SKY = '#04050b'; // The galaxy behind the see-through panels stays dark in both themes.

describe.each([
  ['dark', ':root'],
  ['light', ":root[data-theme='light']"],
])('%s theme text contrast (WCAG AA, 4.5:1)', (_name, selector) => {
  const t = { ...tokens(css, ':root'), ...tokens(css, selector) };
  const backgrounds = {
    panel: over(t['--panel']!, SKY),
    solid: t['--panel-solid']!,
    reader: over(t['--reader-bg']!, SKY),
  };
  // Selected rows and pressed buttons: gold text on the soft gold tint.
  const tinted = over(t['--accent-soft']!, t['--panel-solid']!);

  for (const [where, bg] of Object.entries(backgrounds)) {
    for (const text of ['--fg', '--fg-2', '--fg-3', '--muted', '--accent']) {
      it(`${text} on ${where}`, () => expect(contrast(t[text]!, bg)).toBeGreaterThanOrEqual(4.5));
    }
  }
  it('--accent on the selected tint', () => expect(contrast(t['--accent']!, tinted)).toBeGreaterThanOrEqual(4.5));
});

describe('dark theme', () => {
  it('keeps the original colors', () => {
    expect(tokens(css, ':root')).toMatchObject({
      '--bg': '#04050b',
      '--fg': '#e8e6f0',
      '--muted': '#8b8aa0',
      '--accent': '#f2c76e',
      '--panel': 'rgba(12, 14, 28, 0.78)',
      '--panel-solid': 'rgb(14, 16, 31)',
    });
  });

  it('the light theme keeps the dark sky', () => {
    expect(tokens(css, ":root[data-theme='light']")['--bg']).toBeUndefined();
  });
});
