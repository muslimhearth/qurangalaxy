/** What a wheel event should do to the camera. `factor` scales the camera distance (< 1 zooms in). */
export type WheelIntent = { kind: 'zoom'; factor: number } | { kind: 'orbit'; dx: number; dy: number };

/** The parts of a WheelEvent the classifier reads. */
export interface WheelLike {
  deltaX: number;
  deltaY: number;
  deltaMode: number;
  ctrlKey: boolean;
}

/** Zoom per pixel of pinch. Browsers report pinches as ctrl + wheel with small deltas. */
const PINCH_SPEED = 0.012;
/** Zoom per pixel of mouse wheel (one 100 px notch ≈ 16 %). */
const WHEEL_SPEED = 0.0015;
/** Pixels per line for line-mode wheels (Firefox mouse wheels). */
const LINE_PX = 33;
/** Once a touchpad swipe starts, its events stay orbit for this long after the last one. */
export const LATCH_MS = 200;

/** Zoom speed (log-zoom per ms) up to which a gesture keeps the base speed. */
export const SLOW_RATE = 0.0015;
/** Zoom speed at which the gain reaches `MAX_GAIN`: a hard flick or a fast wheel spin. */
export const FAST_RATE = 0.009;
/** Largest speed-up for a hard flick. */
export const MAX_GAIN = 2.5;
/** A pause longer than this (ms) starts a new gesture at the base speed. */
const GESTURE_GAP_MS = 150;

/**
 * Speed-up for a zoom gesture moving at `rate` (log-zoom per ms): 1 for slow, careful
 * gestures, rising linearly to `MAX_GAIN` for hard flicks, like momentum in map apps.
 */
export function zoomGain(rate: number): number {
  const t = Math.min(1, Math.max(0, (rate - SLOW_RATE) / (FAST_RATE - SLOW_RATE)));
  return 1 + (MAX_GAIN - 1) * t;
}

/**
 * Creates a stateful classifier that tells touchpad gestures from mouse wheels:
 * Zoom steps speed up for fast gestures (`zoomGain`).
 * - ctrl + wheel is a pinch (Chrome, Firefox, Edge) → zoom, faster than the default;
 * - line-mode or large single-axis notches are a mouse wheel → zoom;
 * - anything else is a two-finger touchpad swipe → orbit, latched for the whole swipe
 *   so a fast flick does not switch to zoom halfway.
 * `now` is a timestamp in ms (e.g. event.timeStamp).
 */
export function createWheelClassifier() {
  let swipeUntil = -Infinity;
  let lastZoom = -Infinity;
  let rate = 0;
  // Scales one zoom step by how fast the gesture moves (smoothed over recent events).
  const zoom = (step: number, now: number): WheelIntent => {
    const gap = now - lastZoom;
    lastZoom = now;
    if (gap > GESTURE_GAP_MS) rate = 0;
    else rate = 0.5 * rate + 0.5 * (Math.abs(step) / Math.max(gap, 8));
    return { kind: 'zoom', factor: Math.exp(step * zoomGain(rate)) };
  };
  return (e: WheelLike, now: number): WheelIntent => {
    const scale = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? 800 : 1;
    const dy = e.deltaY * scale;
    if (e.ctrlKey) return zoom(dy * PINCH_SPEED, now);
    const swiping = now <= swipeUntil;
    const notch = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50);
    if (notch && !swiping) return zoom(dy * WHEEL_SPEED, now);
    swipeUntil = now + LATCH_MS;
    return { kind: 'orbit', dx: e.deltaX * scale, dy };
  };
}
