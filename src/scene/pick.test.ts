import { describe, expect, it } from 'vitest';
import { nearestOnScreen, tapRadius } from './pick';

describe('nearestOnScreen', () => {
  // Screen points as x, y, visible (1/0) triples.
  const pts = new Float32Array([100, 100, 1, 130, 100, 1, 300, 300, 1, 105, 102, 0]);

  it('picks the closest visible point within the radius', () => {
    expect(nearestOnScreen(pts, 110, 100, 30)).toBe(0);
    expect(nearestOnScreen(pts, 125, 100, 30)).toBe(1);
  });

  it('returns null when nothing is close enough', () => {
    expect(nearestOnScreen(pts, 200, 200, 30)).toBeNull();
  });

  it('ignores points behind the camera', () => {
    // Index 3 is closest to (105, 102) but not visible.
    expect(nearestOnScreen(pts, 105, 102, 30)).toBe(0);
  });
});

describe('tapRadius', () => {
  it('is generous for fingers and tight for a mouse', () => {
    expect(tapRadius('touch')).toBeGreaterThanOrEqual(24);
    expect(tapRadius('mouse')).toBeLessThan(tapRadius('touch'));
  });
});
