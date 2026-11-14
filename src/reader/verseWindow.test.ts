import { describe, expect, it } from 'vitest';
import { growWindow, initialWindow, isFull } from './verseWindow';

describe('verse window', () => {
  it('starts a few verses before the target and reaches further after it', () => {
    expect(initialWindow(286, 16)).toEqual({ start: 11, end: 41 });
    expect(initialWindow(286, 0)).toEqual({ start: 0, end: 30 });
    expect(initialWindow(7, 3)).toEqual({ start: 0, end: 7 });
    expect(initialWindow(286, 285)).toEqual({ start: 256, end: 286 });
  });

  it('grows by one chunk on each side until it holds every verse', () => {
    let w = initialWindow(286, 100);
    w = growWindow(w, 286);
    expect(w).toEqual({ start: 15, end: 205 });
    while (!isFull(w, 286)) w = growWindow(w, 286);
    expect(w).toEqual({ start: 0, end: 286 });
  });
});
