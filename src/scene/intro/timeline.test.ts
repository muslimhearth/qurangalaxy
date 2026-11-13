import { describe, expect, it } from 'vitest';
import {
  INTRO,
  IntroClock,
  appearProgress,
  easeInOutCubic,
  introLength,
  morphProgress,
  pullAmount,
  shouldSkipIntro,
  starDelay,
  twinkle,
} from './timeline';

const morphStart = INTRO.appear + INTRO.hold;

describe('easeInOutCubic', () => {
  it('starts at 0, ends at 1, is symmetric and monotone', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1);
    let prev = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      expect(easeInOutCubic(t)).toBeGreaterThanOrEqual(prev);
      prev = easeInOutCubic(t);
    }
  });
  it('clamps outside [0, 1]', () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });
});

describe('starDelay', () => {
  it('starts at the right edge (Arabic reading order) and ends at the left', () => {
    expect(starDelay(1)).toBe(0);
    expect(starDelay(0)).toBe(INTRO.wave);
    expect(starDelay(0.5)).toBeCloseTo(INTRO.wave / 2);
  });
});

describe('appearProgress', () => {
  it('rises from 0 to 1 during the appear phase', () => {
    expect(appearProgress(0, 0)).toBe(0);
    expect(appearProgress(INTRO.appear, 0)).toBe(1);
    expect(appearProgress(INTRO.appear, starDelay(0))).toBe(1);
  });
});

describe('morphProgress', () => {
  it('is 0 through the hold and 1 at the end of the intro for every delay', () => {
    expect(morphProgress(0, 0)).toBe(0);
    expect(morphProgress(morphStart, 0)).toBe(0);
    expect(morphProgress(introLength, 0)).toBe(1);
    expect(morphProgress(introLength, INTRO.wave)).toBe(1);
  });
  it('lets right-side stars move first', () => {
    const t = morphStart + 1;
    expect(morphProgress(t, starDelay(1))).toBeGreaterThan(morphProgress(t, starDelay(0)));
  });
});

describe('pullAmount', () => {
  it('pulls small stars more than big ones, and never fully', () => {
    expect(pullAmount(0)).toBeGreaterThan(pullAmount(1));
    expect(pullAmount(0)).toBeLessThan(1);
    expect(pullAmount(1)).toBeGreaterThan(0);
  });
});

describe('twinkle', () => {
  it('stays near 1', () => {
    for (let t = 0; t < 5; t += 0.1) {
      expect(twinkle(t, 1.3)).toBeGreaterThan(0.8);
      expect(twinkle(t, 1.3)).toBeLessThan(1.2);
    }
  });
});

describe('shouldSkipIntro', () => {
  const base = { reducedMotion: false, hash: '', search: '' };
  it('plays on a plain first visit', () => expect(shouldSkipIntro(base)).toBe(false));
  it('skips for reduced motion', () => expect(shouldSkipIntro({ ...base, reducedMotion: true })).toBe(true));
  it('skips for a root deep link only', () => {
    expect(shouldSkipIntro({ ...base, hash: '#/root/%D8%B1%D8%AD%D9%85' })).toBe(true);
    expect(shouldSkipIntro({ ...base, hash: '#/' })).toBe(false);
  });
  it('skips with ?nointro', () => {
    expect(shouldSkipIntro({ ...base, search: '?nointro' })).toBe(true);
    expect(shouldSkipIntro({ ...base, search: '?a=1&nointro' })).toBe(true);
  });
});

describe('IntroClock', () => {
  it('runs to the end and reports done', () => {
    const c = new IntroClock();
    expect(c.done).toBe(false);
    c.advance(introLength - 0.01);
    expect(c.done).toBe(false);
    c.advance(0.02);
    expect(c.done).toBe(true);
    expect(c.t).toBe(introLength);
  });
  it('a skip jumps to the morph and finishes it in about a second', () => {
    const c = new IntroClock();
    c.advance(0.5);
    c.skip();
    expect(c.t).toBe(morphStart);
    c.advance(1.1);
    expect(c.done).toBe(true);
  });
  it('a skip during the morph keeps the current position', () => {
    const c = new IntroClock();
    c.advance(morphStart + 1);
    const t = c.t;
    c.skip();
    expect(c.t).toBe(t);
  });
  it('can start finished', () => {
    const c = new IntroClock(true);
    expect(c.done).toBe(true);
    expect(c.t).toBe(introLength);
  });
});
