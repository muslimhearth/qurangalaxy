import { describe, expect, it } from 'vitest';
import { createWheelClassifier, FAST_RATE, LATCH_MS, MAX_GAIN, SLOW_RATE, zoomGain } from './wheel';

const ev = (deltaY: number, o: Partial<{ deltaX: number; deltaMode: number; ctrlKey: boolean }> = {}) => ({
  deltaX: 0,
  deltaMode: 0,
  ctrlKey: false,
  deltaY,
  ...o,
});

describe('wheel classifier', () => {
  it('turns a touchpad pinch (ctrl + wheel) into a zoom of useful speed', () => {
    const c = createWheelClassifier();
    const out = c(ev(-5, { ctrlKey: true }), 0);
    expect(out.kind).toBe('zoom');
    // Pinching out by a few pixels must zoom in noticeably (at least 3 %), not crawl.
    if (out.kind === 'zoom') expect(out.factor).toBeLessThan(0.97);
  });

  it('turns a two-finger touchpad swipe into an orbit', () => {
    const c = createWheelClassifier();
    expect(c(ev(3.5, { deltaX: -2 }), 0)).toEqual({ kind: 'orbit', dx: -2, dy: 3.5 });
  });

  it('keeps a mouse wheel as zoom (line mode, as Firefox reports it)', () => {
    const c = createWheelClassifier();
    const out = c(ev(3, { deltaMode: 1 }), 0);
    expect(out.kind).toBe('zoom');
    if (out.kind === 'zoom') expect(out.factor).toBeGreaterThan(1);
  });

  it('keeps a mouse wheel as zoom (big pixel notches, as Chrome reports it)', () => {
    const c = createWheelClassifier();
    expect(c(ev(-100), 0).kind).toBe('zoom');
    expect(c(ev(120), 1000).kind).toBe('zoom');
  });

  it('stays in orbit for a fast swipe that looks like a wheel notch mid-gesture', () => {
    const c = createWheelClassifier();
    c(ev(4), 0);
    expect(c(ev(100), 16).kind).toBe('orbit');
    // After a pause the latch expires and a notch is a wheel again.
    expect(c(ev(100), 16 + LATCH_MS + 1).kind).toBe('zoom');
  });

  it('zooms in for negative delta and out for positive delta', () => {
    const c = createWheelClassifier();
    const zin = c(ev(-100), 0);
    const zout = c(ev(100), 1000);
    expect(zin.kind === 'zoom' && zin.factor < 1).toBe(true);
    expect(zout.kind === 'zoom' && zout.factor > 1).toBe(true);
  });
});

describe('zoomGain', () => {
  it('is 1 for slow gestures and grows for fast ones, up to a cap', () => {
    expect(zoomGain(0)).toBe(1);
    expect(zoomGain(SLOW_RATE)).toBe(1);
    expect(zoomGain((SLOW_RATE + FAST_RATE) / 2)).toBeGreaterThan(1);
    expect(zoomGain(FAST_RATE)).toBeCloseTo(MAX_GAIN);
    expect(zoomGain(FAST_RATE * 10)).toBeCloseTo(MAX_GAIN);
  });
});

describe('flick acceleration', () => {
  /** Log-zoom per event for a pinch of `n` events, `px` each, every `ms`. */
  const pinch = (px: number, ms: number, n = 8) => {
    const c = createWheelClassifier();
    let last = 0;
    for (let i = 0; i < n; i++) {
      const out = c(ev(-px, { ctrlKey: true }), 1000 + i * ms);
      if (out.kind === 'zoom') last = -Math.log(out.factor);
    }
    return last;
  };

  it('zooms more per pixel for a hard flick than for a slow pinch', () => {
    const slow = pinch(1, 16) / 1;
    const fast = pinch(12, 16) / 12;
    expect(fast).toBeGreaterThan(slow * 1.5);
  });

  it('keeps a slow pinch at the base speed', () => {
    const c = createWheelClassifier();
    const out = c(ev(-1, { ctrlKey: true }), 0);
    if (out.kind === 'zoom') expect(-Math.log(out.factor)).toBeCloseTo(0.012);
  });

  it('starts each new gesture from the base speed after a pause', () => {
    const c = createWheelClassifier();
    for (let i = 0; i < 8; i++) c(ev(-12, { ctrlKey: true }), 1000 + i * 16);
    const out = c(ev(-1, { ctrlKey: true }), 3000);
    if (out.kind === 'zoom') expect(-Math.log(out.factor)).toBeCloseTo(0.012);
  });

  it('accelerates fast mouse-wheel spins too', () => {
    const spin = (ms: number) => {
      const c = createWheelClassifier();
      let last = 0;
      for (let i = 0; i < 6; i++) {
        const out = c(ev(100), 1000 + i * ms);
        if (out.kind === 'zoom') last = Math.log(out.factor);
      }
      return last;
    };
    expect(spin(15)).toBeGreaterThan(spin(200) * 1.5);
  });
});
