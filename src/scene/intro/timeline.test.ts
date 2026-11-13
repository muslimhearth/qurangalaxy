import { describe, expect, it } from 'vitest';
import {
  INTRO,
  IntroClock,
  appearProgress,
  easeInOutCubic,
  easeOpen,
  frozenIntroTime,
  introPhase,
  introLength,
  morphProgress,
  shouldSkipIntro,
  twinkle,
} from './timeline';


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

describe('easeOpen', () => {
  it('starts slowly, keeps speeding up, and ends at 1', () => {
    expect(easeOpen(0)).toBe(0);
    expect(easeOpen(1)).toBe(1);
    // Slow start: the first fifth of the time covers only a tiny part of the way.
    expect(easeOpen(0.2)).toBeLessThan(0.02);
    // Speeds up: the step from 0.5 to 0.7 is bigger than the step from 0.3 to 0.5.
    expect(easeOpen(0.7) - easeOpen(0.5)).toBeGreaterThan(easeOpen(0.5) - easeOpen(0.3));
    let prev = 0;
    for (let t = 0; t <= 1.0001; t += 0.02) {
      expect(easeOpen(t)).toBeGreaterThanOrEqual(prev);
      prev = easeOpen(t);
    }
  });
});

describe('appearProgress and morphProgress', () => {
  it('both start at app open (t = 0) with no pause', () => {
    expect(appearProgress(0.3, 0)).toBeGreaterThan(0);
    expect(morphProgress(0.5, 0)).toBeGreaterThan(0);
  });
  it('are complete at the end for every delay', () => {
    expect(appearProgress(introLength, INTRO.wave)).toBe(1);
    expect(morphProgress(introLength, 0)).toBe(1);
    expect(morphProgress(introLength, INTRO.wave)).toBe(1);
  });
  it('let inner stars (smaller delay) go first', () => {
    expect(morphProgress(1, 0)).toBeGreaterThan(morphProgress(1, INTRO.wave));
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
  it('skips in automated browsers unless ?intro asks for it', () => {
    expect(shouldSkipIntro({ ...base, automated: true })).toBe(true);
    expect(shouldSkipIntro({ ...base, automated: true, search: '?intro' })).toBe(false);
    expect(shouldSkipIntro({ ...base, automated: true, search: '?intro', reducedMotion: true })).toBe(true);
    expect(shouldSkipIntro({ ...base, automated: true, search: '?intro', hash: '#/root/x' })).toBe(true);
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
  it('a skip keeps the current position and finishes in about a second', () => {
    const c = new IntroClock();
    c.advance(0.5);
    c.skip();
    expect(c.t).toBe(0.5);
    c.advance(1.1);
    expect(c.done).toBe(true);
  });
  it('can finish at once', () => {
    const c = new IntroClock();
    c.finish();
    expect(c.done).toBe(true);
  });
  it('can start finished', () => {
    const c = new IntroClock(true);
    expect(c.done).toBe(true);
    expect(c.t).toBe(introLength);
  });
});

describe('introPhase', () => {
  it('names each phase in order', () => {
    expect(introPhase(0)).toBe('appear');
    expect(introPhase(INTRO.appear)).toBe('morph');
    expect(introPhase(introLength)).toBe('done');
  });
});

describe('frozenIntroTime', () => {
  it('reads ?introAt and clamps it', () => {
    expect(frozenIntroTime('')).toBeNull();
    expect(frozenIntroTime('?introAt=1.5')).toBe(1.5);
    expect(frozenIntroTime('?introAt=99')).toBe(introLength);
    expect(frozenIntroTime('?introAt=x')).toBeNull();
  });
  it('holds the clock until a skip', () => {
    const c = new IntroClock();
    c.freeze(2);
    c.advance(1);
    expect(c.t).toBe(2);
    c.skip();
    c.advance(10);
    expect(c.done).toBe(true);
  });
});
