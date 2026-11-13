import type { Root, Vec3 } from '../../data/types';
import { LABEL_LIFT } from '../labels';
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
 * stretched by `aspect`. The ring size follows the largest of the star `radii`. The selected
 * root itself stays at home. Empty without a selection.
 */
export function focusPlan(
  roots: readonly Root[],
  adj: Adjacency,
  selectedId: number | null,
  toCamera: Vec3,
  aspect: number,
  radii: Float32Array,
): FocusPlan {
  const center = selectedId === null ? undefined : roots[selectedId]?.pos;
  if (selectedId === null || !center) return { ids: [], targets: new Float32Array(0) };
  const ids = topNeighbors(adj, selectedId).map((n) => n.id);
  const maxRadius = radii.reduce((m, r) => Math.max(m, r), 0);
  const targets = ringTargets(center, toCamera, ids.length, ringRadius(maxRadius), aspect);
  // A label sits LABEL_LIFT radii above its star. Lift smaller stars by the difference, so every
  // ring label sits the same height above its ring point and the ring layout spaces the labels.
  ids.forEach((id, k) => (targets[k * 3 + 1]! += LABEL_LIFT * (maxRadius - (radii[id] ?? maxRadius))));
  return { ids, targets };
}
