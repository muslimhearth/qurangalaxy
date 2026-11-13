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

/**
 * Creates a stateful classifier that tells touchpad gestures from mouse wheels:
 * - ctrl + wheel is a pinch (Chrome, Firefox, Edge) → zoom, faster than the default;
 * - line-mode or large single-axis notches are a mouse wheel → zoom;
 * - anything else is a two-finger touchpad swipe → orbit, latched for the whole swipe
 *   so a fast flick does not switch to zoom halfway.
 * `now` is a timestamp in ms (e.g. event.timeStamp).
 */
export function createWheelClassifier() {
  let swipeUntil = -Infinity;
  return (e: WheelLike, now: number): WheelIntent => {
    const scale = e.deltaMode === 1 ? LINE_PX : e.deltaMode === 2 ? 800 : 1;
    const dy = e.deltaY * scale;
    if (e.ctrlKey) return { kind: 'zoom', factor: Math.exp(dy * PINCH_SPEED) };
    const swiping = now <= swipeUntil;
    const notch = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50);
    if (notch && !swiping) return { kind: 'zoom', factor: Math.exp(dy * WHEEL_SPEED) };
    swipeUntil = now + LATCH_MS;
    return { kind: 'orbit', dx: e.deltaX * scale, dy };
  };
}
