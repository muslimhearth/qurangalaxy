/**
 * Index of the visible screen point nearest to (x, y) within `radius` pixels, or null.
 * `points` holds x, y, visible (1 or 0) per point.
 */
export function nearestOnScreen(points: Float32Array, x: number, y: number, radius: number): number | null {
  let best: number | null = null;
  let bestD = radius * radius;
  for (let i = 0; i < points.length / 3; i++) {
    if (!points[i * 3 + 2]) continue;
    const dx = points[i * 3]! - x;
    const dy = points[i * 3 + 1]! - y;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Tap tolerance in CSS pixels: a fingertip covers far more than a mouse pointer. */
export function tapRadius(pointerType: string): number {
  return pointerType === 'touch' || pointerType === 'pen' ? 28 : 10;
}
