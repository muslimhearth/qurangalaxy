import type { Inset } from './inset';
import { labelBox, type Box } from './labels';
import { TOP_LINKS, type Adjacency } from './neighbors';

/**
 * Ids of the selected root's neighbors past the `TOP_LINKS` bright links, strongest first.
 * Their links are faint; their labels sit at the far end of the link, or at the screen edge.
 */
export function faintLabelIds(adj: Adjacency, selectedId: number | null): number[] {
  if (selectedId === null) return [];
  return (adj[selectedId] ?? []).slice(TOP_LINKS).map((n) => n.id);
}

/** The screen area the UI leaves free: the screen minus the panel and the top bar. */
export function freeRect(inset: Inset, width: number, height: number): Box {
  return { x: 0, y: inset.top, w: width - inset.right, h: height - inset.top - inset.bottom };
}

/** A point in clip space (after the projection matrix, before the divide by w). */
export interface Clip {
  x: number;
  y: number;
  w: number;
}

/** Points closer to the camera plane than this (in w) count as behind it. */
const NEAR_W = 1e-3;

/**
 * CSS pixel position of the far end `to` of a line that starts at `from`. When `to` is behind the
 * camera, it moves along the line to just in front of the camera first: the result then lies far
 * off screen in the direction the line leaves the screen. Null when `from` is behind the camera.
 */
export function segmentEndScreen(from: Clip, to: Clip, width: number, height: number): { x: number; y: number } | null {
  if (from.w < NEAR_W) return null;
  let p = to;
  if (to.w < NEAR_W) {
    const t = (from.w - NEAR_W) / (from.w - to.w);
    p = { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y), w: NEAR_W };
  }
  return { x: ((p.x / p.w + 1) / 2) * width, y: ((1 - p.y / p.w) / 2) * height };
}

/** A label anchor: the line end itself, or (`pinned`) the point where the line leaves the rect. */
export interface Pin {
  x: number;
  y: number;
  pinned: boolean;
}

/**
 * Anchor for the label at the far end `to` of a line from `from`: `to` when it lies inside `rect`,
 * else the point where the line leaves `rect`. A `from` outside `rect` is clamped into it first.
 */
export function edgePin(from: { x: number; y: number }, to: { x: number; y: number }, rect: Box): Pin {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;
  if (to.x >= rect.x && to.x <= right && to.y >= rect.y && to.y <= bottom) return { x: to.x, y: to.y, pinned: false };
  const fx = Math.min(right, Math.max(rect.x, from.x));
  const fy = Math.min(bottom, Math.max(rect.y, from.y));
  const dx = to.x - fx;
  const dy = to.y - fy;
  // Largest step t in 0..1 along the line that stays inside the rect on both axes.
  let t = 1;
  if (dx > 0) t = Math.min(t, (right - fx) / dx);
  if (dx < 0) t = Math.min(t, (rect.x - fx) / dx);
  if (dy > 0) t = Math.min(t, (bottom - fy) / dy);
  if (dy < 0) t = Math.min(t, (rect.y - fy) / dy);
  return { x: fx + t * dx, y: fy + t * dy, pinned: true };
}

/**
 * Screen box of the label at the far end of a faint link from `from` to `to` (clip space; `to` is
 * the label anchor above the star). Above the star when it lies in the `free` area, else pinned
 * where the line leaves it. Null when the selected root is behind the camera.
 */
export function faintLabelBox(
  from: Clip,
  to: Clip,
  size: { w: number; h: number },
  view: { width: number; height: number },
  free: Box,
): Box | null {
  const start = segmentEndScreen(from, from, view.width, view.height);
  const end = segmentEndScreen(from, to, view.width, view.height);
  if (!start || !end) return null;
  const pin = edgePin(start, end, free);
  return pin.pinned ? pinnedBox(pin, size, free) : labelBox(pin, size);
}

/** Pixels between a pinned label and the edge of the free area. */
const PIN_MARGIN = 4;

/** Screen box of a label centered on a pin, moved inside `rect` (with a small margin). */
export function pinnedBox(p: { x: number; y: number }, size: { w: number; h: number }, rect: Box): Box {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  return {
    x: clamp(p.x - size.w / 2, rect.x + PIN_MARGIN, rect.x + rect.w - PIN_MARGIN - size.w),
    y: clamp(p.y - size.h / 2, rect.y + PIN_MARGIN, rect.y + rect.h - PIN_MARGIN - size.h),
    w: size.w,
    h: size.h,
  };
}
