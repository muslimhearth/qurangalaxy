import type { Adjacency } from './neighbors';

/**
 * Ids of roots that get a text label: the selected root, the hovered root,
 * up to `maxNeighbors` strongest neighbors of each, then the `top` roots.
 * No duplicates; focus labels come first.
 */
export function labelIds(
  adj: Adjacency,
  top: readonly number[],
  selectedId: number | null,
  hoveredId: number | null,
  maxNeighbors = 24,
): number[] {
  const ids = new Set<number>();
  for (const focus of [selectedId, hoveredId]) {
    if (focus === null) continue;
    ids.add(focus);
    for (const n of (adj[focus] ?? []).slice(0, maxNeighbors)) ids.add(n.id);
  }
  for (const id of top) ids.add(id);
  return [...ids];
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
