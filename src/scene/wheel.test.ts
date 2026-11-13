import { describe, expect, it } from 'vitest';
import { createWheelClassifier, LATCH_MS } from './wheel';

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
