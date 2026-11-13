import { describe, expect, it } from 'vitest';
import { flow, hitTest, mushafLayout, sizeFor } from './layout';
import { VERSE_COUNTS } from './surahs';

describe('sizeFor', () => {
  it('uses 2 px gaps for big dots and 1 px gaps for small dots', () => {
    expect(sizeFor(8)).toMatchObject({ dot: 8, gap: 2, surahGap: 6 });
    expect(sizeFor(4)).toMatchObject({ dot: 4, gap: 1, surahGap: 3 });
  });
});

describe('flow', () => {
  it('places verses left to right and wraps rows', () => {
    // 2 surahs (3 and 2 verses), dot 8 + gap 2 = pitch 10, room for 4 dots per row.
    const f = flow([3, 2], sizeFor(8), 40);
    // Row 0: surah 1 (3 dots), then the surah gap pushes surah 2 to the next row.
    expect([...f.x]).toEqual([0, 10, 20, 0, 10]);
    expect([...f.y]).toEqual([0, 0, 0, 10, 10]);
    expect(f.rowStart).toEqual([0, 3]);
  });

  it('adds a gap before each surah that starts mid-row', () => {
    const f = flow([2, 2], sizeFor(8), 100);
    // Surah 2 starts after 2 dots + 6 px surah gap.
    expect([...f.x]).toEqual([0, 10, 26, 36]);
    expect(f.rowStart).toEqual([0]);
    expect(f.width).toBe(44);
  });
});

describe('mushafLayout', () => {
  it('fits the whole Quran in a desktop free area without scrolling', () => {
    const l = mushafLayout(VERSE_COUNTS, 820, 620);
    expect(l.dot).toBeGreaterThanOrEqual(5);
    expect(l.x).toHaveLength(6236);
    const bottom = Math.max(...l.y) + l.dot;
    const right = Math.max(...l.x) + l.dot;
    expect(bottom).toBeLessThanOrEqual(620);
    expect(right).toBeLessThanOrEqual(820);
    expect(Math.min(...l.x)).toBeGreaterThanOrEqual(l.gutter);
  });

  it('uses small dots on a phone', () => {
    const l = mushafLayout(VERSE_COUNTS, 358, 440);
    expect(l.dot).toBeLessThanOrEqual(4);
    expect(l.dot).toBeGreaterThanOrEqual(2);
    expect(Math.max(...l.y) + l.dot).toBeLessThanOrEqual(440);
  });

  it('labels rows with the first surah that starts there, without crowding', () => {
    const l = mushafLayout(VERSE_COUNTS, 820, 620);
    expect(l.labels[0]).toMatchObject({ surah: 1 });
    // Labels go down the page in surah order and keep a minimum spacing.
    for (let i = 1; i < l.labels.length; i++) {
      expect(l.labels[i]!.surah).toBeGreaterThan(l.labels[i - 1]!.surah);
      expect(l.labels[i]!.y - l.labels[i - 1]!.y).toBeGreaterThanOrEqual(10);
    }
    expect(l.labels.length).toBeGreaterThan(20);
  });
});

describe('hitTest', () => {
  const l = mushafLayout([3, 2], 200, 100);
  const center = (i: number) => [l.x[i]! + l.dot / 2, l.y[i]! + l.dot / 2] as const;

  it('finds the dot under the point', () => {
    for (let i = 0; i < 5; i++) expect(hitTest(l, ...center(i), 0)).toBe(i);
  });

  it('finds the nearest dot within the radius, else -1', () => {
    const [x, y] = center(4);
    expect(hitTest(l, x + l.dot, y, 12)).toBe(4);
    expect(hitTest(l, x + 40, y, 12)).toBe(-1);
    expect(hitTest(l, -50, -50, 12)).toBe(-1);
  });
});
