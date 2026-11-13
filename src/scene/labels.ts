import { TOP_LINKS, type Adjacency } from './neighbors';

/**
 * Ids of roots that may get a text label, highest priority first: the selected root,
 * the hovered root, up to `maxNeighbors` strongest neighbors of each (by default the lit
 * links, `TOP_LINKS`), then the `top` roots.
 * No duplicates. `declutter` later hides the ones that collide.
 */
export function labelIds(
  adj: Adjacency,
  top: readonly number[],
  selectedId: number | null,
  hoveredId: number | null,
  maxNeighbors = TOP_LINKS,
): number[] {
  const focus = [selectedId, hoveredId].filter((id) => id !== null);
  const ids = new Set<number>(focus);
  for (const f of focus) for (const n of (adj[f] ?? []).slice(0, maxNeighbors)) ids.add(n.id);
  for (const id of top) ids.add(id);
  return [...ids];
}

/** A screen rectangle in CSS pixels; x and y are the top-left corner. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Screen box of a label drawn centered above its anchor point. */
export function labelBox(anchor: { x: number; y: number }, size: { w: number; h: number }): Box {
  return { x: anchor.x - size.w / 2, y: anchor.y - size.h, w: size.w, h: size.h };
}

/** Pixels kept free between two labels. */
const LABEL_GAP = 2;

const overlaps = (a: Box, b: Box, gap: number) =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/**
 * Greedy label placement. `boxes` is in priority order; a box is kept when it touches
 * neither a kept box nor a `blocked` area (such as the side panel). Null boxes are hidden.
 * Returns one flag per box.
 */
export function declutter(boxes: readonly (Box | null)[], blocked: readonly Box[]): boolean[] {
  const kept: Box[] = [];
  return boxes.map((b) => {
    if (!b || blocked.some((z) => overlaps(b, z, 0)) || kept.some((k) => overlaps(b, k, LABEL_GAP))) {
      return false;
    }
    kept.push(b);
    return true;
  });
}

/** A label's pixel position. `visible` is false when the point is behind the camera. */
export interface ScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Converts normalized device coordinates (output of Vector3.project) to CSS pixels.
 * NDC y points up, screen y points down. |z| >= 1 means outside the clip range
 * (behind the camera or beyond the far plane).
 */
export function ndcToScreen(
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): ScreenPoint {
  return {
    x: ((x + 1) / 2) * width,
    y: ((1 - y) / 2) * height,
    visible: z > -1 && z < 1,
  };
}
