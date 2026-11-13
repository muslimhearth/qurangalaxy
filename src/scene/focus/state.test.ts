import { describe, expect, it } from 'vitest';
import { createFocusState, GLIDE_SECONDS } from './state';

describe('createFocusState', () => {
  const home = new Float32Array([1, 2, 3, 4, 5, 6]);

  it('starts with the stars at home and glides over GLIDE_SECONDS', () => {
    const f = createFocusState(home, false);
    expect(Array.from(f.glide.positions)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(f.glide.duration).toBe(GLIDE_SECONDS);
    expect(GLIDE_SECONDS).toBeGreaterThan(0.5);
    expect(GLIDE_SECONDS).toBeLessThan(2);
  });

  it('jumps instead of gliding for reduced motion', () => {
    expect(createFocusState(home, true).glide.duration).toBe(0);
  });
});
