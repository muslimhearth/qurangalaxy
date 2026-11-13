import type { Root, Vec3 } from '../../data/types';
import { topNeighbors, type Adjacency } from '../neighbors';
import { ringRadius, ringTargets } from './ring';

/** Which stars move for a selection, and where to (3 floats per star, same order as `ids`). */
export interface FocusPlan {
  ids: number[];
  targets: Float32Array;
}

/**
 * Focus layout for `selectedId`: its strongest neighbors (strongest first) on the ring around
 * its galaxy position, facing the camera (`toCamera` points from the root to the camera),
 * stretched by `aspect`. The selected root itself stays at home. Empty without a selection.
 */
export function focusPlan(
  roots: readonly Root[],
  adj: Adjacency,
  selectedId: number | null,
  toCamera: Vec3,
  aspect: number,
  maxStarRadius: number,
): FocusPlan {
  const center = selectedId === null ? undefined : roots[selectedId]?.pos;
  if (selectedId === null || !center) return { ids: [], targets: new Float32Array(0) };
  const ids = topNeighbors(adj, selectedId).map((n) => n.id);
  return { ids, targets: ringTargets(center, toCamera, ids.length, ringRadius(maxStarRadius), aspect) };
}
